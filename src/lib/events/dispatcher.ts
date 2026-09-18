import { SyncoraEvent, WebhookEndpoint } from '../integrations/types';
import { processWebhookDelivery, processIntegrationDelivery } from '../webhooks/delivery';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Dispatches an event to all subscribed external systems (Webhooks & Integrations).
 * This observer layer does not duplicate mutation logic. It relies on the authoritative
 * CRUD mutations to trigger this asynchronously.
 * 
 * @param event The structured event to dispatch
 */
export async function dispatchEvent(event: SyncoraEvent) {
  console.log(`[Event Dispatcher] Dispatching event: ${event.type} for workspace ${event.workspaceId}`);
  
  const supabase = await createClient();

  // Idempotency check: Have we processed this event_id?
  const { data: idempotencyRecord } = await (supabase as any)
    .from('webhook_idempotency')
    .insert({ event_id: event.id })
    .select('event_id')
    .single();

  if (!idempotencyRecord) {
    console.log(`[Event Dispatcher] Event ${event.id} already dispatched (Idempotency skip)`);
    return;
  }

  // Fetch active webhooks
  const { data: endpoints } = await (supabase as any)
    .from('webhook_endpoints')
    .select('*')
    .eq('workspace_id', event.workspaceId)
    .eq('status', 'active');

  const subscribedEndpoints = (endpoints || []).filter((ep: WebhookEndpoint) => 
    ep.subscribed_events.includes(event.type) || ep.subscribed_events.includes('*')
  );

  const deliveryIds: string[] = [];

  // Synchronously create delivery records (PENDING)
  for (const endpoint of subscribedEndpoints) {
    const { data: deliveryRecord } = await (supabase as any)
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
    
    if (deliveryRecord) {
      deliveryIds.push(deliveryRecord.id);
    }
  }

  // (Mock) Synchronous insert for native integration events
  // integrationDeliveryIds.push(...)

  // Use Next.js 15 unstable_after to queue background tasks so we do not block the main CRUD mutation response.
  after(async () => {
    try {
      const tasks = [
        ...deliveryIds.map(id => processWebhookDelivery(id, event)),
        processIntegrationDelivery(event)
      ];

      await Promise.allSettled(tasks);
    } catch (error) {
      console.error(`[Event Dispatcher] Failed background processing for event ${event.id}`, error);
    }
  });
}
