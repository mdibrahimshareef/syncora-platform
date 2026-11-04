import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, rateLimitHeaders, getClientIp } from '@/lib/rate-limit';

describe('Phase 4: In-Memory Sliding Window Rate Limiter', () => {
  beforeEach(() => {
    // Unique keys per test to avoid collision
  });

  it('allows requests within the specified limit', () => {
    const key = `test-ip-${Date.now()}`;
    const result1 = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('blocks requests that exceed the specified limit', () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, { limit: 2, windowMs: 1000 });
    rateLimit(key, { limit: 2, windowMs: 1000 });

    const blocked = rateLimit(key, { limit: 2, windowMs: 1000 });
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it('generates standard rate-limiting headers', () => {
    const key = `test-headers-${Date.now()}`;
    rateLimit(key, { limit: 1, windowMs: 5000 });
    const blocked = rateLimit(key, { limit: 1, windowMs: 5000 });

    const headers = rateLimitHeaders(blocked);
    expect(headers['X-RateLimit-Limit']).toBe('1');
    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['Retry-After']).toBeDefined();
  });

  it('extracts client IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
    });
    expect(getClientIp(req)).toBe('203.0.113.195');
  });
});

