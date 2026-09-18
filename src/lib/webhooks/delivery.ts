import crypto from 'crypto';
import { SyncoraEvent } from '../integrations/types';
import { createClient } from '@/lib/supabase/server';

/**
 * Processes a specific webhook delivery asynchronously in the background.
 * Implements bounded retries for transient failures.
 */
export async function processWebhookDelivery(deliveryId: string, event: SyncoraEvent, attempt = 1) {
  const supabase = await createClient();
  
  // Fetch delivery and endpoint info
  const { data: delivery } = await (supabase as any)
    .from('webhook_deliveries')
    .select('*, webhook_endpoints(url, secret)')
    .eq('id', deliveryId)
    .single();

  if (!delivery || !delivery.webhook_endpoints) return;

  const endpoint = delivery.webhook_endpoints;
  const payloadStr = JSON.stringify(event);
  const signature = generateHmacSignature(payloadStr, endpoint.secret);
  
  const startTime = Date.now();
  let responseStatus: number | undefined;
  let errorMsg: string | undefined;
  let success = false;

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Syncora-Event': event.type,
        'X-Syncora-Delivery': deliveryId,
        'X-Syncora-Signature': `sha256=${signature}`
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    responseStatus = response.status;
    if (response.ok) {
      success = true;
    } else {
      errorMsg = `HTTP Error: ${response.status} ${response.statusText}`;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Network error or timeout';
  }

  const responseTime = Date.now() - startTime;

  // Handle Retries for transient failures (e.g., 5xx or timeouts)
  const isTransient = !success && (!responseStatus || responseStatus >= 500 || responseStatus === 429);
  const maxAttempts = 3;
  
  if (isTransient && attempt < maxAttempts) {
    await (supabase as any).from('webhook_deliveries').update({ status: 'retrying', attempt_count: attempt }).eq('id', deliveryId);
    
    // Exponential backoff (this is running in the background via Next.js unstable_after, so it won't block the user)
    const backoffMs = Math.pow(2, attempt) * 1000;
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    
    return processWebhookDelivery(deliveryId, event, attempt + 1);
  }

  // Final Update
  await (supabase as any)
    .from('webhook_deliveries')
    .update({
      status: success ? 'delivered' : 'failed',
      response_status: responseStatus,
      response_time: responseTime,
      error: errorMsg,
      delivered_at: success ? new Date().toISOString() : null,
      attempt_count: attempt
    })
    .eq('id', deliveryId);
    
  // Update endpoint stats
  await (supabase as any)
    .from('webhook_endpoints')
    .update({
      last_delivery_at: new Date().toISOString(),
      ...(success ? { last_success_at: new Date().toISOString() } : { last_failure_at: new Date().toISOString() })
    })
    .eq('id', delivery.endpoint_id);
}

export async function processIntegrationDelivery(event: SyncoraEvent) {
  // Logic to process native integrations
}

function generateHmacSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}
