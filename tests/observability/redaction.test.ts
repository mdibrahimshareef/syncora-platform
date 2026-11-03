import { describe, it, expect } from 'vitest';
import { redactSensitiveData } from '@/lib/observability/redaction';

describe('Release 18 Observability: Sensitive Data Redaction Engine', () => {
  it('redacts sensitive keys in nested objects', () => {
    const payload = {
      user: {
        id: 'usr-101',
        email: 'user@example.com',
        password: 'PlainTextPassword123',
        clientSecret: 'slack-client-secret-999',
        encryptionKey: '0123456789abcdef0123456789abcdef',
        session: {
          sessionId: 'sess_abc123',
          token: 'token_xyz789',
        }
      },
      env: {
        databaseUrl: 'postgres://postgres:mypassword@localhost:5432/syncora',
        serviceRoleKey: 'secret-role-key',
        safePort: 3000
      }
    };

    const sanitized = redactSensitiveData(payload) as {
      user: Record<string, unknown>;
      env: Record<string, unknown>;
    };

    expect(sanitized.user.id).toBe('usr-101');
    expect(sanitized.user.email).toBe('user@example.com');
    expect(sanitized.user.password).toBe('[REDACTED]');
    expect(sanitized.user.clientSecret).toBe('[REDACTED]');
    expect(sanitized.user.encryptionKey).toBe('[REDACTED]');
    expect(sanitized.user.session).toBe('[REDACTED]');
    expect(sanitized.env.databaseUrl).toBe('[REDACTED]');
    expect(sanitized.env.serviceRoleKey).toBe('[REDACTED]');
    expect(sanitized.env.safePort).toBe(3000);
  });

  it('redacts tokens and keys embedded within strings', () => {
    const testCases = [
      {
        input: 'User authenticated with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.abcdef',
        contains: 'Bearer [REDACTED]',
      },
      {
        input: 'Using OpenAI API with key sk-abcdef1234567890abcdef12345678 in request',
        contains: 'sk-[REDACTED]',
      },
      {
        input: 'Google AI key AIzaSyA12345678901234567890123456789012 configured',
        contains: 'AIza[REDACTED]',
      },
      {
        input: 'Slack bot token xoxb-1234567890-1234567890123-abcdef123456 loaded',
        contains: 'xox-[REDACTED]',
      },
      {
        input: 'GitHub access token ghp_123456789012345678901234567890123456 authorized',
        contains: 'gh[REDACTED]',
      },
      {
        input: 'Connecting to database postgres://syncora_user:secretpass123@db.supabase.co:5432/postgres pool',
        contains: 'postgres://[REDACTED]:[REDACTED]@db.supabase.co:5432/postgres pool',
      }
    ];

    for (const { input, contains } of testCases) {
      const sanitized = redactSensitiveData(input);
      expect(sanitized).toContain(contains);
    }
  });

  it('handles cyclical references safely without stack overflow', () => {
    const circularObj: Record<string, unknown> = { name: 'circular-test', safe: true };
    circularObj.self = circularObj;

    const result = redactSensitiveData(circularObj) as Record<string, unknown>;
    expect(result.name).toBe('circular-test');
    expect(result.safe).toBe(true);
    expect(result.self).toBe('[Circular]');
  });

  it('leaves safe primitive types and arrays untouched', () => {
    expect(redactSensitiveData(null)).toBeNull();
    expect(redactSensitiveData(undefined)).toBeUndefined();
    expect(redactSensitiveData(12345)).toBe(12345);
    expect(redactSensitiveData(true)).toBe(true);
    expect(redactSensitiveData(['item1', 'item2', 99])).toEqual(['item1', 'item2', 99]);
  });
});
