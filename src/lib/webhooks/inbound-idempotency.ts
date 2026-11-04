import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';

export interface InboundEventRecordParams {
  provider: string;
  externalEventId: string;
  eventType?: string;
  payload?: any;
}

export interface InboundEventRecordResult {
  isDuplicate: boolean;
  eventId?: string;
}

/**
 * Checks and records inbound webhook events in the durable inbound_webhook_events table.
 * Enforces database-level idempotency via UNIQUE (provider, external_event_id).
 */
export async function recordInboundWebhookEvent({
  provider,
  externalEventId,
  eventType = 'unknown',
  payload = null,
}: InboundEventRecordParams): Promise<InboundEventRecordResult> {
  const adminSupabase = createAdminClient();

  try {
    const { data, error } = await (adminSupabase as any)
      .from('inbound_webhook_events')
      .insert({
        provider,
        external_event_id: externalEventId,
        event_type: eventType,
        payload,
        status: 'received',
      })
      .select('id')
      .single();

    if (error) {
      // PostgreSQL code 23505 indicates unique_violation (duplicate delivery)
      if (error.code === '23505' || error.message?.includes('uq_inbound_provider_event') || error.message?.includes('duplicate key')) {
        logger.info({
          operation: 'inbound_webhook.duplicate_detected',
          metadata: {
            provider,
            externalEventId,
          },
        });
        return { isDuplicate: true };
      }

      logger.error({
        operation: 'inbound_webhook.insert_error',
        message: error.message,
        metadata: {
          provider,
          externalEventId,
        },
      });
      throw error;
    }

    return {
      isDuplicate: false,
      eventId: data?.id,
    };
  } catch (err: any) {
    if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
      return { isDuplicate: true };
    }
    throw err;
  }
}

/**
 * Updates status of an inbound webhook event after processing.
 */
export async function updateInboundWebhookStatus(
  eventId: string,
  status: 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const adminSupabase = createAdminClient();

  const updateData: Record<string, any> = {
    status,
    processed_at: new Date().toISOString(),
  };

  if (errorMessage) {
    updateData.error = errorMessage;
  }

  await (adminSupabase as any)
    .from('inbound_webhook_events')
    .update(updateData)
    .eq('id', eventId);
}

