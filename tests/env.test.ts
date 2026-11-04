import { describe, it, expect } from 'vitest';
import { validateServerEnv, validatePublicEnv } from '@/lib/env';

describe('Phase 4: Environment Variable Validation', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key-with-sufficient-length',
    NEXT_PUBLIC_APP_URL: 'https://app.syncora.com',
  };

  describe('validatePublicEnv', () => {
    it('accepts valid public variables', () => {
      const result = validatePublicEnv(validBaseEnv);
      expect(result.success).toBe(true);
      expect(result.data?.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    });

    it('rejects invalid Supabase URL', () => {
      const result = validatePublicEnv({
        ...validBaseEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    });

    it('rejects missing anon key', () => {
      const result = validatePublicEnv({
        ...validBaseEnv,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });
  });

  describe('validateServerEnv', () => {
    it('validates in non-production environment without requiring secrets', () => {
      const result = validateServerEnv({
        ...validBaseEnv,
        NODE_ENV: 'development',
      });
      expect(result.success).toBe(true);
    });

    it('rejects in production when required secrets are missing', () => {
      const result = validateServerEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        // Missing SUPABASE_SERVICE_ROLE_KEY, SYNCORA_ENCRYPTION_KEY, CRON_SECRET
      });
      expect(result.success).toBe(false);
      expect(result.errors?.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
      expect(result.errors?.SYNCORA_ENCRYPTION_KEY).toBeDefined();
      expect(result.errors?.CRON_SECRET).toBeDefined();
    });

    it('accepts valid 64-character hex encryption key in production', () => {
      const result = validateServerEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        SUPABASE_SERVICE_ROLE_KEY: 'valid-service-role-key-string-longer-than-16',
        SYNCORA_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 hex chars
        CRON_SECRET: 'production-cron-secret-32-chars-long',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid 32-character utf8 encryption key in production', () => {
      const result = validateServerEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        SUPABASE_SERVICE_ROLE_KEY: 'valid-service-role-key-string-longer-than-16',
        SYNCORA_ENCRYPTION_KEY: '12345678901234567890123456789012', // 32 chars
        CRON_SECRET: 'production-cron-secret-32-chars-long',
      });
      expect(result.success).toBe(true);
    });

    it('rejects weak or invalid encryption key', () => {
      const result = validateServerEnv({
        ...validBaseEnv,
        NODE_ENV: 'production',
        SUPABASE_SERVICE_ROLE_KEY: 'valid-service-role-key-string-longer-than-16',
        SYNCORA_ENCRYPTION_KEY: 'too-short-key',
        CRON_SECRET: 'production-cron-secret-32-chars-long',
      });
      expect(result.success).toBe(false);
      expect(result.errors?.SYNCORA_ENCRYPTION_KEY).toBeDefined();
    });
  });
});

