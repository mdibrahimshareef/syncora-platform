import { SyncoraEvent, WebhookEndpoint } from '../integrations/types';
import { processWebhookDelivery, processIntegrationDelivery } from '../webhooks/delivery';
import { processEventForAutomations } from '../automations/engine';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';

/**
 * Dispatches an event to all subscribed external systems (Webhooks & Integrations).
 * This observer layer does not duplicate mutation logic. It relies on the authoritative
 * CRUD mutations to trigger this asynchronously.
 * 
 * Finding 15.1 Fix:
 * Uses privileged admin client strictly scoped to event.workspaceId so that regular
 * authenticated users do not encounter RLS insert denial on webhook_idempotency.
 * 
 * @param event The structured event to dispatch
 * @param depth Current recursion depth for automation loop prevention
 */
export async function dispatchEvent(event: SyncoraEvent, depth: number = 1): Promise<void> {
  if (!event || !event.id) {
    logger.warn({
      operation: 'event.dispatch.invalid_event',
      metadata: { event: event as unknown as Record<string, unknown> },
    });
    return;
  }

  // Strict tenant boundary verification
  if (!event.workspaceId || typeof event.workspaceId !== 'string') {
    logger.error({
      operation: 'event.dispatch.missing_workspace_id',
      metadata: {
        eventId: event.id,
        eventType: event.type,
      },
    });
    return;
  }

  logger.info({
    operation: 'event.dispatch.started',
    workspaceId: event.workspaceId,
    metadata: {
      eventId: event.id,
      eventType: event.type,
      depth,
    },
  });

  const adminSupabase = createAdminClient();

  // Idempotency check: Have we processed this event_id?
  // Privileged admin client ensures normal authenticated users are not blocked by RLS.
  const { data: idempotencyRecord, error: idempotencyError } = await (adminSupabase as any)
    .from('webhook_idempotency')
    .insert({ event_id: event.id })
    .select('event_id')
    .single();

  if (idempotencyError) {
    // Unique key violation (PostgreSQL 23505) indicates duplicate event dispatch
    if (idempotencyError.code === '23505' || idempotencyError.message?.includes('duplicate key')) {
      logger.info({
        operation: 'event.dispatch.idempotent_skip',
        workspaceId: event.workspaceId,
        metadata: {
          eventId: event.id,
          eventType: event.type,
        },
      });
      return;
    }

    logger.error({
      operation: 'event.dispatch.idempotency_error',
      workspaceId: event.workspaceId,
      message: idempotencyError.message,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        error: idempotencyError.message,
      },
    });
    return;
  }

  if (!idempotencyRecord) {
    logger.info({
      operation: 'event.dispatch.idempotent_skip',
      workspaceId: event.workspaceId,
      metadata: {
        eventId: event.id,
        eventType: event.type,
      },
    });
    return;
  }

  // Fetch active webhooks strictly filtered by the event's workspace boundary
  const { data: endpoints, error: endpointError } = await (adminSupabase as any)
    .from('webhook_endpoints')
    .select('*')
    .eq('workspace_id', event.workspaceId)
    .eq('status', 'active');

  if (endpointError) {
    logger.error({
      operation: 'event.dispatch.endpoints_query_error',
      workspaceId: event.workspaceId,
      message: endpointError.message,
      metadata: {
        eventId: event.id,
        error: endpointError.message,
      },
    });
  }

  const subscribedEndpoints = (endpoints || []).filter((ep: WebhookEndpoint) =>
    ep.subscribed_events?.includes(event.type) || ep.subscribed_events?.includes('*')
  );

  const deliveryIds: string[] = [];

  // Synchronously create delivery records (PENDING) inside tenant workspace boundary
  for (const endpoint of subscribedEndpoints) {
    const { data: deliveryRecord, error: deliveryError } = await (adminSupabase as any)
      .from('webhook_deliveries')
      .insert({
        endpoint_id: endpoint.id,
        workspace_id: event.workspaceId,
        event_id: event.id,
        event_type: event.type,
        status: 'pending',
        payload: event
      })
      .select('id')
      .single();

    if (deliveryError) {
      logger.error({
        operation: 'event.dispatch.delivery_insert_error',
        workspaceId: event.workspaceId,
        message: deliveryError.message,
        metadata: {
          eventId: event.id,
          endpointId: endpoint.id,
          error: deliveryError.message,
        },
      });
    } else if (deliveryRecord?.id) {
      deliveryIds.push(deliveryRecord.id);
    }
  }

  logger.info({
    operation: 'event.dispatch.deliveries_queued',
    workspaceId: event.workspaceId,
    metadata: {
      eventId: event.id,
      eventType: event.type,
      queuedDeliveriesCount: deliveryIds.length,
    },
  });

  // Use Next.js after() to queue background tasks so we do not block the main CRUD mutation response.
  // Fall back to direct asynchronous execution if called outside a Next.js request scope (e.g. background workers, tests).
  const runBackgroundTasks = async () => {
    const timer = logger.startTimer('event.dispatch.background_execution', {
      workspaceId: event.workspaceId,
      metadata: {
        eventId: event.id,
        eventType: event.type,
      },
    });

    try {
      const tasks = [
        ...deliveryIds.map(id => processWebhookDelivery(id, event)),
        processIntegrationDelivery(event),
        processEventForAutomations(event, depth)
      ];

      const results = await Promise.allSettled(tasks);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        logger.warn({
          operation: 'event.dispatch.background_partial_failures',
          workspaceId: event.workspaceId,
          metadata: {
            eventId: event.id,
            totalTasks: tasks.length,
            failureCount: failures.length,
          },
        });
      }
      timer.done();
    } catch (error: any) {
      logger.error({
        operation: 'event.dispatch.background_failure',
        workspaceId: event.workspaceId,
        message: error?.message || String(error),
        metadata: {
          eventId: event.id,
          eventType: event.type,
        },
      });
    }
  };

  try {
    after(runBackgroundTasks);
  } catch {
    // Outside of Next.js request scope (unit tests, CLI, workers)
    runBackgroundTasks().catch((err) => {
      logger.error({
        operation: 'event.dispatch.background_fallback_failure',
        message: err?.message || String(err),
      });
    });
  }
}
