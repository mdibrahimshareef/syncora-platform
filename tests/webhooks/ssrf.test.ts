import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '@/lib/webhooks/delivery';

describe('Phase 3: Webhook Delivery SSRF Protection', () => {
  describe('Valid public destinations', () => {
    it('accepts valid HTTPS public URLs', () => {
      expect(validateWebhookUrl('https://api.github.com/webhook')).toEqual({ isValid: true });
      expect(validateWebhookUrl('https://hooks.slack.com/services/T00/B00/XXXX')).toEqual({ isValid: true });
      expect(validateWebhookUrl('https://syncora.example.com/api/v1/events')).toEqual({ isValid: true });
    });

    it('accepts valid public routable IPv4 addresses', () => {
      expect(validateWebhookUrl('https://93.184.216.34/webhook')).toEqual({ isValid: true });
      expect(validateWebhookUrl('https://8.8.8.8/hook')).toEqual({ isValid: true });
    });
  });

  describe('Loopback address rejection', () => {
    it('rejects localhost and localhost subdomains', () => {
      expect(validateWebhookUrl('http://localhost:3000/webhook').isValid).toBe(false);
      expect(validateWebhookUrl('https://localhost/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://sub.localhost:8080/').isValid).toBe(false);
    });

    it('rejects 127.0.0.0/8 IPv4 loopback range', () => {
      expect(validateWebhookUrl('http://127.0.0.1:8000').isValid).toBe(false);
      expect(validateWebhookUrl('http://127.0.0.2:3000').isValid).toBe(false);
      expect(validateWebhookUrl('http://127.255.255.255').isValid).toBe(false);
    });

    it('rejects IPv6 loopback [::1]', () => {
      expect(validateWebhookUrl('http://[::1]:8080').isValid).toBe(false);
      expect(validateWebhookUrl('https://[::1]').isValid).toBe(false);
    });
  });

  describe('RFC 1918 Private network rejection', () => {
    it('rejects 10.0.0.0/8 private addresses', () => {
      expect(validateWebhookUrl('http://10.0.0.1/hook').isValid).toBe(false);
      expect(validateWebhookUrl('https://10.254.1.1:8443').isValid).toBe(false);
    });

    it('rejects 172.16.0.0/12 private addresses', () => {
      expect(validateWebhookUrl('http://172.16.0.1/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://172.31.255.254/hook').isValid).toBe(false);
    });

    it('rejects 192.168.0.0/16 private addresses', () => {
      expect(validateWebhookUrl('http://192.168.1.1/webhook').isValid).toBe(false);
      expect(validateWebhookUrl('http://192.168.0.254/webhook').isValid).toBe(false);
    });
  });

  describe('Cloud metadata service rejection', () => {
    it('rejects AWS/GCP 169.254.169.254 metadata endpoint', () => {
      const res = validateWebhookUrl('http://169.254.169.254/latest/meta-data/');
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('prohibited');
    });

    it('rejects GCP metadata.google.internal endpoint', () => {
      const res = validateWebhookUrl('http://metadata.google.internal/computeMetadata/v1/');
      expect(res.isValid).toBe(false);
    });

    it('rejects 169.254.0.0/16 link-local addresses', () => {
      expect(validateWebhookUrl('http://169.254.1.1').isValid).toBe(false);
      expect(validateWebhookUrl('http://169.254.254.254').isValid).toBe(false);
    });
  });

  describe('Internal and non-routable hostnames & protocols', () => {
    it('rejects internal domain extensions (.local, .internal, .corp, .lan)', () => {
      expect(validateWebhookUrl('http://service.internal/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://app.local/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://router.lan/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://intranet.corp/hook').isValid).toBe(false);
    });

    it('rejects non-routable 0.0.0.0/8', () => {
      expect(validateWebhookUrl('http://0.0.0.0:8000').isValid).toBe(false);
    });

    it('rejects documentation test networks', () => {
      expect(validateWebhookUrl('http://192.0.2.1/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://198.51.100.1/hook').isValid).toBe(false);
      expect(validateWebhookUrl('http://203.0.113.1/hook').isValid).toBe(false);
    });

    it('rejects non-HTTP protocols (file:, ftp:, gopher:)', () => {
      expect(validateWebhookUrl('file:///etc/passwd').isValid).toBe(false);
      expect(validateWebhookUrl('ftp://ftp.example.com').isValid).toBe(false);
      expect(validateWebhookUrl('gopher://127.0.0.1:70').isValid).toBe(false);
    });

    it('rejects malformed or empty URLs', () => {
      expect(validateWebhookUrl('').isValid).toBe(false);
      expect(validateWebhookUrl('not-a-url').isValid).toBe(false);
    });
  });
});

