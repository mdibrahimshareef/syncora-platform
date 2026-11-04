import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { githubProvider } from '@/lib/integrations/github';
import { slackProvider } from '@/lib/integrations/slack';

describe('Phase 3: Webhook Inbound Signature Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GitHub Webhook Signatures (HMAC-SHA256)', () => {
    const GITHUB_SECRET = 'super-secret-github-key-12345';

    beforeEach(() => {
      process.env.GITHUB_WEBHOOK_SECRET = GITHUB_SECRET;
    });

    it('validates authentic GitHub signature using HMAC-SHA256', async () => {
      const payload = JSON.stringify({ action: 'opened', issue: { id: 42, title: 'Bug report' } });
      const hmac = crypto.createHmac('sha256', GITHUB_SECRET).update(payload, 'utf8').digest('hex');
      const signatureHeader = `sha256=${hmac}`;

      const req = new Request('http://localhost:3000/api/webhooks/inbound/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': signatureHeader,
          'content-type': 'application/json',
        },
      });

      const isValid = await githubProvider.verifyWebhookSignature!(req, payload);
      expect(isValid).toBe(true);
    });

    it('rejects tampered payload content with authentic header', async () => {
      const payload = JSON.stringify({ action: 'opened', issue: { id: 42 } });
      const tamperedPayload = JSON.stringify({ action: 'opened', issue: { id: 999 } });
      const hmac = crypto.createHmac('sha256', GITHUB_SECRET).update(payload, 'utf8').digest('hex');

      const req = new Request('http://localhost:3000/api/webhooks/inbound/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': `sha256=${hmac}`,
        },
      });

      const isValid = await githubProvider.verifyWebhookSignature!(req, tamperedPayload);
      expect(isValid).toBe(false);
    });

    it('rejects forged signature header', async () => {
      const payload = JSON.stringify({ action: 'opened' });
      const fakeHmac = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const req = new Request('http://localhost:3000/api/webhooks/inbound/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': `sha256=${fakeHmac}`,
        },
      });

      const isValid = await githubProvider.verifyWebhookSignature!(req, payload);
      expect(isValid).toBe(false);
    });

    it('rejects missing or malformed signature header', async () => {
      const payload = JSON.stringify({ action: 'ping' });

      const reqNoHeader = new Request('http://localhost:3000/api/webhooks/inbound/github', {
        method: 'POST',
      });
      expect(await githubProvider.verifyWebhookSignature!(reqNoHeader, payload)).toBe(false);

      const reqBadPrefix = new Request('http://localhost:3000/api/webhooks/inbound/github', {
        method: 'POST',
        headers: { 'x-hub-signature-256': 'sha1=123456' },
      });
      expect(await githubProvider.verifyWebhookSignature!(reqBadPrefix, payload)).toBe(false);
    });
  });

  describe('Slack Webhook Signatures (v0 HMAC-SHA256 & Replay Protection)', () => {
    const SLACK_SECRET = 'slack-signing-secret-abcdef123456';

    beforeEach(() => {
      process.env.SLACK_SIGNING_SECRET = SLACK_SECRET;
    });

    it('validates authentic Slack request within valid 5-minute replay window', async () => {
      const payload = JSON.stringify({ type: 'event_callback', event: { type: 'app_mention' } });
      const currentTimestamp = Math.floor(Date.now() / 1000).toString();
      const baseString = `v0:${currentTimestamp}:${payload}`;
      const hmac = crypto.createHmac('sha256', SLACK_SECRET).update(baseString, 'utf8').digest('hex');
      const signature = `v0=${hmac}`;

      const req = new Request('http://localhost:3000/api/webhooks/inbound/slack', {
        method: 'POST',
        headers: {
          'x-slack-signature': signature,
          'x-slack-request-timestamp': currentTimestamp,
        },
      });

      const isValid = await slackProvider.verifyWebhookSignature!(req, payload);
      expect(isValid).toBe(true);
    });

    it('rejects expired request timestamp older than 300 seconds (Replay Protection)', async () => {
      const payload = JSON.stringify({ type: 'event_callback' });
      // 301 seconds in the past
      const expiredTimestamp = (Math.floor(Date.now() / 1000) - 301).toString();
      const baseString = `v0:${expiredTimestamp}:${payload}`;
      const hmac = crypto.createHmac('sha256', SLACK_SECRET).update(baseString, 'utf8').digest('hex');

      const req = new Request('http://localhost:3000/api/webhooks/inbound/slack', {
        method: 'POST',
        headers: {
          'x-slack-signature': `v0=${hmac}`,
          'x-slack-request-timestamp': expiredTimestamp,
        },
      });

      const isValid = await slackProvider.verifyWebhookSignature!(req, payload);
      expect(isValid).toBe(false);
    });

    it('rejects future timestamp exceeding 300 seconds (Clock skew abuse)', async () => {
      const payload = JSON.stringify({ type: 'event_callback' });
      // 350 seconds in future
      const futureTimestamp = (Math.floor(Date.now() / 1000) + 350).toString();
      const baseString = `v0:${futureTimestamp}:${payload}`;
      const hmac = crypto.createHmac('sha256', SLACK_SECRET).update(baseString, 'utf8').digest('hex');

      const req = new Request('http://localhost:3000/api/webhooks/inbound/slack', {
        method: 'POST',
        headers: {
          'x-slack-signature': `v0=${hmac}`,
          'x-slack-request-timestamp': futureTimestamp,
        },
      });

      const isValid = await slackProvider.verifyWebhookSignature!(req, payload);
      expect(isValid).toBe(false);
    });

    it('rejects tampered payload under valid signature and timestamp', async () => {
      const payload = JSON.stringify({ message: 'original' });
      const tampered = JSON.stringify({ message: 'tampered' });
      const currentTimestamp = Math.floor(Date.now() / 1000).toString();
      const baseString = `v0:${currentTimestamp}:${payload}`;
      const hmac = crypto.createHmac('sha256', SLACK_SECRET).update(baseString, 'utf8').digest('hex');

      const req = new Request('http://localhost:3000/api/webhooks/inbound/slack', {
        method: 'POST',
        headers: {
          'x-slack-signature': `v0=${hmac}`,
          'x-slack-request-timestamp': currentTimestamp,
        },
      });

      const isValid = await slackProvider.verifyWebhookSignature!(req, tampered);
      expect(isValid).toBe(false);
    });
  });
});

