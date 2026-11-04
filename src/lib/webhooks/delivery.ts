import crypto from 'crypto';
import { SyncoraEvent } from '../integrations/types';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';

/**
 * SSRF Protection Validator.
 * Rejects loopback, link-local, RFC 1918 private IPv4, IPv6 private/link-local,
 * cloud metadata service addresses, and non-HTTP(S) protocols.
 */
export function validateWebhookUrl(urlStr: string): { isValid: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, reason: 'Empty or invalid URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { isValid: false, reason: 'Malformed URL format' };
  }

  // 1. Strict Protocol Validation
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject localhost and known local domain extensions
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.lan')
  ) {
    return { isValid: false, reason: 'Local and internal hostnames are prohibited' };
  }

  // 3. Reject Cloud Metadata service endpoints
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.metadata.google.internal') ||
    hostname === 'instance-data'
  ) {
    return { isValid: false, reason: 'Cloud metadata service access is prohibited' };
  }

  // 4. Validate IPv4 addresses
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const o1 = parseInt(ipv4Match[1], 10);
    const o2 = parseInt(ipv4Match[2], 10);
    const o3 = parseInt(ipv4Match[3], 10);
    const o4 = parseInt(ipv4Match[4], 10);

    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) {
      return { isValid: false, reason: 'Invalid IPv4 octet value' };
    }

    // 0.0.0.0/8 (Current network)
    if (o1 === 0) {
      return { isValid: false, reason: 'Non-routable 0.0.0.0/8 address' };
    }

    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) {
      return { isValid: false, reason: 'Loopback 127.0.0.0/8 address prohibited' };
    }

    // 10.0.0.0/8 (RFC 1918 Private)
    if (o1 === 10) {
      return { isValid: false, reason: 'Private 10.0.0.0/8 address prohibited' };
    }

    // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) {
      return { isValid: false, reason: 'Private 172.16.0.0/12 address prohibited' };
    }

    // 192.168.0.0/16 (RFC 1918 Private)
    if (o1 === 192 && o2 === 168) {
      return { isValid: false, reason: 'Private 192.168.0.0/16 address prohibited' };
    }

    // 169.254.0.0/16 (Link-local & AWS/GCP Metadata)
    if (o1 === 169 && o2 === 254) {
      return { isValid: false, reason: 'Link-local 169.254.0.0/16 address prohibited' };
    }

    // 100.64.0.0/10 (Carrier-Grade NAT: 100.64.0.0 - 100.127.255.255)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) {
      return { isValid: false, reason: 'Carrier-Grade NAT address prohibited' };
    }

    // TEST-NET documentation addresses
    if (
      (o1 === 192 && o2 === 0 && o3 === 2) || // 192.0.2.0/24
      (o1 === 198 && o2 === 51 && o3 === 100) || // 198.51.100.0/24
      (o1 === 203 && o2 === 0 && o3 === 113) // 203.0.113.0/24
    ) {
      return { isValid: false, reason: 'Test-net documentation IP prohibited' };
    }
  }

  // 5. Validate IPv6 addresses (enclosed in brackets or bare)
  const cleanIPv6 = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (cleanIPv6.includes(':')) {
    // Loopback
    if (cleanIPv6 === '::1' || cleanIPv6 === '0:0:0:0:0:0:0:1') {
      return { isValid: false, reason: 'IPv6 loopback prohibited' };
    }
    // Unspecified
    if (cleanIPv6 === '::' || cleanIPv6 === '0:0:0:0:0:0:0:0') {
      return { isValid: false, reason: 'IPv6 unspecified address prohibited' };
    }
    // Link-local: fe80::/10
    if (/^fe[89ab][0-9a-f]:/i.test(cleanIPv6)) {
      return { isValid: false, reason: 'IPv6 link-local address prohibited' };
    }
    // Unique local: fc00::/7 (fc00:: - fdff::)
    if (/^f[cd][0-9a-f]{2}:/i.test(cleanIPv6)) {
      return { isValid: false, reason: 'IPv6 unique-local address prohibited' };
    }
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (cleanIPv6.startsWith('::ffff:')) {
      const mappedIPv4 = cleanIPv6.substring(7);
      return validateWebhookUrl(`http://${mappedIPv4}`);
    }
  }

  return { isValid: true };
}

/**
 * Calculates exponential backoff with random jitter.
 */
function calculateBackoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    return Math.min(60000, Math.max(1000, retryAfterMs));
  }
  // Base exponential: 2s, 4s, 8s... capped at 30s + up to 250ms random jitter
  const base = Math.min(30000, Math.pow(2, attempt) * 1000);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

/**
 * Processes a specific webhook delivery asynchronously in the background.
 * Implements SSRF URL validation, bounded retries with jitter, Retry-After header parsing,
 * and dead-letter queue classification on final failure.
 */
export async function processWebhookDelivery(
  deliveryId: string,
  event: SyncoraEvent,
  attempt = 1
): Promise<void> {
  // Use privileged admin client for background execution
  const adminSupabase = createAdminClient();

  // Fetch delivery and endpoint info
  const { data: delivery, error: fetchError } = await adminSupabase
    .from('webhook_deliveries')
    .select('*, webhook_endpoints(id, url, secret, status)')
    .eq('id', deliveryId)
    .single();

  if (fetchError || !delivery || !delivery.webhook_endpoints) {
    logger.warn({
      operation: 'webhook.delivery.record_missing',
      message: fetchError?.message,
      metadata: { deliveryId },
    });
    return;
  }

  const endpoint = delivery.webhook_endpoints;

  // Check endpoint active status
  if (endpoint.status === 'disabled') {
    logger.info({
      operation: 'webhook.delivery.endpoint_disabled',
      metadata: { deliveryId, endpointId: endpoint.id },
    });
    await adminSupabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        error: 'Endpoint is disabled',
        attempt_count: attempt,
      })
      .eq('id', deliveryId);
    return;
  }

  // 1. SSRF Protection: Validate destination URL
  const urlValidation = validateWebhookUrl(endpoint.url);
  if (!urlValidation.isValid) {
    logger.error({
      operation: 'webhook.delivery.ssrf_blocked',
      message: urlValidation.reason,
      metadata: {
        deliveryId,
        endpointId: endpoint.id,
        url: endpoint.url,
        reason: urlValidation.reason,
      },
    });

    await adminSupabase
      .from('webhook_deliveries')
      .update({
        status: 'failed',
        error: `SSRF Blocked: ${urlValidation.reason}`,
        response_status: 400,
        response_time: 0,
        attempt_count: attempt,
      })
      .eq('id', deliveryId);

    return;
  }

  const payloadStr = JSON.stringify(event);
  const signature = generateHmacSignature(payloadStr, endpoint.secret);

  const timer = logger.startTimer('webhook.delivery.attempt', {
    workspaceId: delivery.workspace_id,
    metadata: {
      deliveryId,
      endpointId: endpoint.id,
      attempt,
    },
  });

  const startTime = Date.now();
  let responseStatus: number | undefined;
  let retryAfterMs: number | undefined;
  let errorMsg: string | undefined;
  let success = false;

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Syncora-Event': event.type,
        'X-Syncora-Delivery': deliveryId,
        'X-Syncora-Signature': `sha256=${signature}`,
        'User-Agent': 'Syncora-Webhook-Delivery/1.0',
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    responseStatus = response.status;

    // Parse Retry-After header on 429 Rate Limiting
    if (responseStatus === 429) {
      const retryHeader = response.headers.get('retry-after');
      if (retryHeader) {
        const parsedSeconds = parseInt(retryHeader, 10);
        if (!isNaN(parsedSeconds)) {
          retryAfterMs = parsedSeconds * 1000;
        } else {
          const parsedDate = new Date(retryHeader).getTime();
          if (!isNaN(parsedDate)) {
            retryAfterMs = Math.max(0, parsedDate - Date.now());
          }
        }
      }
    }

    if (response.ok) {
      success = true;
    } else {
      errorMsg = `HTTP Error: ${response.status} ${response.statusText}`;
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Network error or timeout';
  }

  const responseTime = Date.now() - startTime;
  timer.done({
    status: success ? 'success' : 'error',
    metadata: { responseStatus, responseTime },
  });

  const maxAttempts = 3;
  // Transient failure condition: timeouts, 5xx server errors, or 429 rate limits
  const isTransient = !success && (!responseStatus || responseStatus >= 500 || responseStatus === 429);

  if (isTransient && attempt < maxAttempts) {
    const backoffMs = calculateBackoffMs(attempt, retryAfterMs);
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    logger.warn({
      operation: 'webhook.delivery.retry_scheduled',
      message: errorMsg,
      metadata: {
        deliveryId,
        endpointId: endpoint.id,
        attempt,
        nextAttempt: attempt + 1,
        backoffMs,
      },
    });

    await adminSupabase
      .from('webhook_deliveries')
      .update({
        status: 'retrying',
        attempt_count: attempt,
        next_retry_at: nextRetryAt,
        error: errorMsg,
      })
      .eq('id', deliveryId);

    // In unit test environment, avoid long delays
    if (process.env.NODE_ENV !== 'test') {
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }

    return processWebhookDelivery(deliveryId, event, attempt + 1);
  }

  // Final Delivery State: Succeeded, Permanently Failed, or Dead Letter
  const finalStatus = success ? 'delivered' : (attempt >= maxAttempts ? 'dead_letter' : 'failed');

  if (finalStatus === 'dead_letter') {
    logger.error({
      operation: 'webhook.delivery.dead_letter',
      message: errorMsg,
      metadata: {
        deliveryId,
        endpointId: endpoint.id,
        totalAttempts: attempt,
        responseStatus,
      },
    });
  }

  await adminSupabase
    .from('webhook_deliveries')
    .update({
      status: finalStatus,
      response_status: responseStatus,
      response_time: responseTime,
      error: errorMsg,
      delivered_at: success ? new Date().toISOString() : null,
      attempt_count: attempt,
    })
    .eq('id', deliveryId);

  // Update endpoint operational statistics
  await adminSupabase
    .from('webhook_endpoints')
    .update({
      last_delivery_at: new Date().toISOString(),
      ...(success ? { last_success_at: new Date().toISOString() } : { last_failure_at: new Date().toISOString() }),
    })
    .eq('id', endpoint.id);
}

export async function processIntegrationDelivery(event: SyncoraEvent): Promise<void> {
  // Observer layer for native integration dispatch (extensible)
  logger.info({
    operation: 'integration.delivery.observed',
    metadata: { eventId: event.id, eventType: event.type },
  });
}

function generateHmacSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}
