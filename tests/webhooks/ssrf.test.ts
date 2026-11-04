import { describe, it, expect, vi, beforeEach } from 'vitest';
import dns from 'dns';
import {
  validateWebhookUrl,
  validateWebhookUrlAsync,
  isPrivateOrReservedIp,
} from '@/lib/webhooks/delivery';

describe('Phase 4: Webhook Delivery SSRF Protection & DNS Rebinding Hardening', () => {
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

  describe('Direct IP Classification (isPrivateOrReservedIp)', () => {
    it('classifies public IPs as non-private', () => {
      expect(isPrivateOrReservedIp('93.184.216.34')).toEqual({ isPrivate: false });
      expect(isPrivateOrReservedIp('8.8.8.8')).toEqual({ isPrivate: false });
      expect(isPrivateOrReservedIp('1.1.1.1')).toEqual({ isPrivate: false });
    });

    it('classifies private, loopback, and metadata IPs as private', () => {
      expect(isPrivateOrReservedIp('127.0.0.1').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('10.0.0.5').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('172.16.0.1').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('192.168.1.1').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('169.254.169.254').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('0.0.0.0').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('::1').isPrivate).toBe(true);
      expect(isPrivateOrReservedIp('fe80::1').isPrivate).toBe(true);
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

  describe('DNS Rebinding & Resolved IP Defense (validateWebhookUrlAsync)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('rejects domain resolving to private RFC 1918 IP (DNS Rebinding)', async () => {
      // Mock DNS resolving benign-looking hostname to internal private IP
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '10.0.0.1', family: 4 },
      ] as any);

      const res = await validateWebhookUrlAsync('https://sub.attacker-domain.com/webhook');
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('resolved to prohibited IP (10.0.0.1)');
    });

    it('rejects domain resolving to cloud metadata IP 169.254.169.254', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '169.254.169.254', family: 4 },
      ] as any);

      const res = await validateWebhookUrlAsync('https://metadata-rebinding.com/steal-creds');
      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('resolved to prohibited IP (169.254.169.254)');
    });

    it('accepts domain resolving to legitimate public routable IPs', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const res = await validateWebhookUrlAsync('https://valid-partner.com/webhook');
      expect(res.isValid).toBe(true);
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
