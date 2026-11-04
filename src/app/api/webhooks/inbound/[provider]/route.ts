import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { IntegrationProviderAdapter } from '@/lib/integrations/types';
import { slackProvider } from '@/lib/integrations/slack';
import { githubProvider } from '@/lib/integrations/github';
import { googleCalendarProvider } from '@/lib/integrations/google-calendar';
import { recordInboundWebhookEvent, updateInboundWebhookStatus } from '@/lib/webhooks/inbound-idempotency';
import { logger } from '@/lib/observability/logger';
import { extractCorrelationContext } from '@/lib/observability/correlation';

interface InboundWebhookPayload {
  type?: string;
  challenge?: string;
  delivery?: string;
  action?: string;
  event_id?: string;
  id?: string;
  event?: {
    type?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const providers: Record<string, IntegrationProviderAdapter> = {
  slack: slackProvider,
  github: githubProvider,
  google_calendar: googleCalendarProvider,
};

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const correlation = extractCorrelationContext(request.headers);
  const { provider: providerName } = await context.params;
  const provider = providers[providerName];

  if (!provider) {
    logger.warn({
      operation: 'inbound_webhook.unknown_provider',
      correlationId: correlation.correlationId,
      metadata: {
        provider: providerName,
      },
    });
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  const timer = logger.startTimer('inbound_webhook.process', {
    correlationId: correlation.correlationId,
    metadata: {
      provider: providerName,
    },
  });

  try {
    const rawBody = await request.text();

    // 1. Verify signature if the provider adapter defines a verification method
    if (provider.verifyWebhookSignature) {
      const isValid = await provider.verifyWebhookSignature(request, rawBody);
      if (!isValid) {
        logger.warn({
          operation: 'inbound_webhook.signature_rejected',
          correlationId: correlation.correlationId,
          metadata: {
            provider: providerName,
          },
        });
        timer.done({ status: 'error', metadata: { reason: 'invalid_signature' } });
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // 2. Parse payload
    let payload: InboundWebhookPayload = {};
    if (rawBody && rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody) as InboundWebhookPayload;
      } catch {
        payload = { raw: rawBody };
      }
    }

    // Slack URL Verification Challenge handshake
    if (providerName === 'slack' && payload.type === 'url_verification' && payload.challenge) {
      logger.info({
        operation: 'inbound_webhook.slack_url_verification',
        correlationId: correlation.correlationId,
        metadata: {
          provider: providerName,
        },
      });
      timer.done({ status: 'success', metadata: { handshake: true } });
      return NextResponse.json({ challenge: payload.challenge });
    }

    // 3. Extract provider-specific external event ID and event type
    let externalEventId: string;
    let eventType = 'unknown';

    if (providerName === 'github') {
      const deliveryHeader = request.headers.get('x-github-delivery');
      externalEventId = deliveryHeader || payload.delivery || crypto.createHash('sha256').update(rawBody).digest('hex');
      eventType = request.headers.get('x-github-event') || payload.action || 'github.event';
    } else if (providerName === 'slack') {
      externalEventId = payload.event_id || request.headers.get('x-slack-signature') || crypto.createHash('sha256').update(rawBody).digest('hex');
      eventType = payload.event?.type || payload.type || 'slack.event';
    } else {
      externalEventId = payload.id || crypto.createHash('sha256').update(rawBody).digest('hex');
      eventType = payload.type || `${providerName}.event`;
    }

    // 4. Enforce Durable Inbound Idempotency
    const { isDuplicate, eventId } = await recordInboundWebhookEvent({
      provider: providerName,
      externalEventId,
      eventType,
      payload,
    });

    if (isDuplicate) {
      logger.info({
        operation: 'inbound_webhook.duplicate_ignored',
        correlationId: correlation.correlationId,
        metadata: {
          provider: providerName,
          externalEventId,
          eventType,
        },
      });
      timer.done({ status: 'success', metadata: { duplicate: true } });
      return NextResponse.json(
        { success: true, duplicate: true, message: 'Event already recorded and processed' },
        { status: 200 }
      );
    }

    // 5. Provider-specific event routing / processing
    logger.info({
      operation: 'inbound_webhook.processed',
      correlationId: correlation.correlationId,
      metadata: {
        provider: providerName,
        externalEventId,
        eventType,
        eventId,
      },
    });

    if (eventId) {
      await updateInboundWebhookStatus(eventId, 'processed');
    }

    timer.done({ status: 'success', metadata: { duplicate: false } });
    return NextResponse.json({ success: true, eventId, externalEventId }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({
      operation: 'inbound_webhook.error',
      correlationId: correlation.correlationId,
      message: errorMsg,
      metadata: {
        provider: providerName,
        error: errorMsg,
      },
    });
    timer.fail(err, { metadata: { provider: providerName } });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
