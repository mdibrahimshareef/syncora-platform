import { describe, it, expect } from 'vitest';
import { redactSensitiveData, logStructuredAIEvent, createTraceContext } from '../../../src/lib/ai/telemetry';

describe('Release 4.8 Observability: Redaction & Privacy Engine (Section 4.3)', () => {
  it('redacts sensitive keys including password, token, secret, apiKey, authorization, and cookies', () => {
    const rawPayload = {
      user: {
        id: 'usr-123',
        email: 'alice@example.com',
        password: 'SuperSecretPassword123!',
        apiKey: 'sk-abcdef1234567890abcdef1234567890',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID',
      },
      headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        cookie: 'sb-access-token=xyz123; sb-refresh-token=abc456',
        secret: 'prod-stripe-webhook-secret-999'
      },
      metadata: {
        safeField: 'active',
        serviceRoleKey: 'supabase-service-role-secret-key-999'
      }
    };

    const sanitized = redactSensitiveData(rawPayload) as any;

    expect(sanitized.user.id).toBe('usr-123');
    expect(sanitized.user.email).toBe('alice@example.com');
    expect(sanitized.user.password).toBe('[REDACTED]');
    expect(sanitized.user.apiKey).toBe('[REDACTED]');
    expect(sanitized.user.token).toBe('[REDACTED]');
    expect(sanitized.headers.authorization).toBe('[REDACTED]');
    expect(sanitized.headers.cookie).toBe('[REDACTED]');
    expect(sanitized.headers.secret).toBe('[REDACTED]');
    expect(sanitized.metadata.safeField).toBe('active');
    expect(sanitized.metadata.serviceRoleKey).toBe('[REDACTED]');
  });

  it('redacts sensitive API keys and Bearer tokens within plain text strings', () => {
    const logString = 'Connecting with Bearer a1b2c3d4e5f6g7h8 and OpenAI sk-123456789012345678901234 and Google AIzaSyD1234567890123456789012345678901';
    const sanitized = redactSensitiveData(logString);

    expect(sanitized).toContain('Bearer [REDACTED]');
    expect(sanitized).toContain('sk-[REDACTED]');
    expect(sanitized).toContain('AIza[REDACTED]');
    expect(sanitized).not.toContain('a1b2c3d4e5f6g7h8');
    expect(sanitized).not.toContain('sk-123456789012345678901234');
    expect(sanitized).not.toContain('AIzaSyD1234567890123456789012345678901');
  });

  it('safely handles circular references without throwing call stack errors', () => {
    const cyclicObj: any = { name: 'Cyclic Node' };
    cyclicObj.self = cyclicObj;

    const sanitized = redactSensitiveData(cyclicObj) as any;
    expect(sanitized.name).toBe('Cyclic Node');
    expect(sanitized.self).toBe('[Circular]');
  });

  it('preserves array structures and non-sensitive primitives', () => {
    const arr = [
      { id: 1, name: 'Normal Task' },
      { id: 2, secret: 'top-secret' },
      'A message with sk-999999999999999999999999'
    ];

    const sanitized = redactSensitiveData(arr) as any[];
    expect(sanitized[0].name).toBe('Normal Task');
    expect(sanitized[1].secret).toBe('[REDACTED]');
    expect(sanitized[2]).toBe('A message with sk-[REDACTED]');
  });
});
