import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as liveGet } from '@/app/api/health/live/route';
import { GET as readyGet } from '@/app/api/health/ready/route';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Phase 4: Health Probes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('GET /api/health/live', () => {
    it('returns 200 with status ok and uptime', async () => {
      const response = await liveGet();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('syncora-core');
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('GET /api/health/ready', () => {
    it('returns 503 when Supabase environment variables are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await readyGet();
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database).toBe('unconfigured');
    });

    it('returns 200 when database connectivity succeeds', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

      const { createClient } = await import('@supabase/supabase-js');
      const mockLimit = vi.fn().mockResolvedValue({ data: [{ id: 'test-user-id' }], error: null });
      const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
      } as any);

      const response = await readyGet();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ready');
      expect(data.checks.database).toBe('connected');
    });

    it('returns 503 when database returns an error, without leaking connection details', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

      const { createClient } = await import('@supabase/supabase-js');
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('connection refused to postgres://secret_user:secret_password@db.supabase.co:5432/postgres'),
      });
      const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(createClient).mockReturnValue({
        from: mockFrom,
      } as any);

      const response = await readyGet();
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database).toBe('unreachable');
      // Ensure no sensitive connection string was leaked in response
      expect(JSON.stringify(data)).not.toContain('secret_password');
      expect(JSON.stringify(data)).not.toContain('postgres://');
    });
  });
});

