import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { POST } from '@/app/api/webhooks/inbound/[provider]/route';
import * as idempotencyModule from '@/lib/webhooks/inbound-idempotency';

describe('Phase 3: Inbound Webhook API Route (/api/webhooks/inbound/[provider])', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 404 for unknown provider', async () => {
    const req = new Request('http://localhost:3000/api/webhooks/inbound/unknown_service', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const context = { params: Promise.resolve({ provider: 'unknown_service' }) };

    const res = await POST(req, context);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Unknown provider');
  });

  it('rejects inbound GitHub webhook with invalid signature (401)', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'correct-secret-123';

    const rawBody = JSON.stringify({ action: 'opened' });
    const req = new Request('http://localhost:3000/api/webhooks/inbound/github', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': 'sha256=invalidhash0000000000000000000000000000000000000000000000000000',
        'x-github-delivery': 'del-test-1',
      },
      body: rawBody,
    });
    const context = { params: Promise.resolve({ provider: 'github' }) };

    const res = await POST(req, context);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid webhook signature');
  });

  it('accepts and records valid GitHub webhook delivery', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'correct-secret-123';

    const rawBody = JSON.stringify({ action: 'opened', issue: { number: 101 } });
    const hmac = crypto.createHmac('sha256', 'correct-secret-123').update(rawBody, 'utf8').digest('hex');

    const recordSpy = vi.spyOn(idempotencyModule, 'recordInboundWebhookEvent').mockResolvedValue({
      isDuplicate: false,
      eventId: 'evt-inbound-101',
    });
    const updateSpy = vi.spyOn(idempotencyModule, 'updateInboundWebhookStatus').mockResolvedValue();

    const req = new Request('http://localhost:3000/api/webhooks/inbound/github', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': `sha256=${hmac}`,
        'x-github-delivery': 'del-github-101',
        'x-github-event': 'issues',
      },
      body: rawBody,
    });
    const context = { params: Promise.resolve({ provider: 'github' }) };

    const res = await POST(req, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.eventId).toBe('evt-inbound-101');

    expect(recordSpy).toHaveBeenCalledWith({
      provider: 'github',
      externalEventId: 'del-github-101',
      eventType: 'issues',
      payload: { action: 'opened', issue: { number: 101 } },
    });
    expect(updateSpy).toHaveBeenCalledWith('evt-inbound-101', 'processed');
  });

  it('idempotently handles duplicate delivery without re-processing', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'correct-secret-123';

    const rawBody = JSON.stringify({ action: 'reopened' });
    const hmac = crypto.createHmac('sha256', 'correct-secret-123').update(rawBody, 'utf8').digest('hex');

    const recordSpy = vi.spyOn(idempotencyModule, 'recordInboundWebhookEvent').mockResolvedValue({
      isDuplicate: true,
    });
    const updateSpy = vi.spyOn(idempotencyModule, 'updateInboundWebhookStatus').mockResolvedValue();

    const req = new Request('http://localhost:3000/api/webhooks/inbound/github', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': `sha256=${hmac}`,
        'x-github-delivery': 'del-github-duplicate',
      },
      body: rawBody,
    });
    const context = { params: Promise.resolve({ provider: 'github' }) };

    const res = await POST(req, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.duplicate).toBe(true);

    // updateInboundWebhookStatus must NOT be called for duplicates
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('responds with challenge parameter on Slack URL verification', async () => {
    process.env.SLACK_SIGNING_SECRET = 'slack-test-secret';

    const payload = { type: 'url_verification', challenge: 'slack-challenge-token-xyz' };
    const rawBody = JSON.stringify(payload);
    const currentTimestamp = Math.floor(Date.now() / 1000).toString();
    const baseString = `v0:${currentTimestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', 'slack-test-secret').update(baseString, 'utf8').digest('hex');

    const req = new Request('http://localhost:3000/api/webhooks/inbound/slack', {
      method: 'POST',
      headers: {
        'x-slack-signature': `v0=${hmac}`,
        'x-slack-request-timestamp': currentTimestamp,
      },
      body: rawBody,
    });
    const context = { params: Promise.resolve({ provider: 'slack' }) };

    const res = await POST(req, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.challenge).toBe('slack-challenge-token-xyz');
  });
});

