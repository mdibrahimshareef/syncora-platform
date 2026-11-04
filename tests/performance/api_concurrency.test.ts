import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { HEADER_REQUEST_ID, HEADER_CORRELATION_ID } from '@/lib/observability/correlation';

// Mock Supabase Auth & DB
const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const mockCreateClient = vi.fn(() => ({
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createAdminClient: () => mockCreateClient(),
}));

// Mock task API mutation functions
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
vi.mock('@/lib/api/tasks', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
}));

// Mock dispatchEvent
vi.mock('@/lib/events/dispatcher', () => ({
  dispatchEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock time-tracking mutation
const mockCreateTimeEntry = vi.fn();
vi.mock('@/lib/api/time-tracking', () => ({
  createTimeEntry: (...args: unknown[]) => mockCreateTimeEntry(...args),
}));

describe('Release 18 Phase 2D: API Route Concurrency & Latency Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'usr-bench-concurrency', email: 'bench@syncora.io' } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { workspace_id: 'ws-bench-concurrent' }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockCreateTask.mockImplementation((_client, _pid, taskData) =>
      Promise.resolve({ id: 'task-gen-' + Math.random(), ...taskData })
    );
    mockUpdateTask.mockImplementation((_client, taskId, payload) =>
      Promise.resolve({ id: taskId, ...payload })
    );
    mockCreateTimeEntry.mockImplementation((_client, payload) =>
      Promise.resolve({ id: 'time-gen-' + Math.random(), ...payload })
    );
  });

  const concurrencyLevels = [1, 5, 10, 25, 50];

  describe('POST /api/tasks — Concurrent Task Creation', () => {
    concurrencyLevels.forEach((concurrency) => {
      it(`evaluates ${concurrency} concurrent requests`, async () => {
        const { POST } = await import('@/app/api/tasks/route');

        const requestBatch = Array.from({ length: concurrency }, (_, idx) => {
          return new NextRequest('http://localhost:3000/api/tasks', {
            method: 'POST',
            headers: {
              [HEADER_REQUEST_ID]: `req-load-${concurrency}-${idx}`,
              [HEADER_CORRELATION_ID]: `corr-load-${concurrency}`,
            },
            body: JSON.stringify({
              projectId: 'proj-bench-1',
              taskData: { title: `Concurrent Task #${idx + 1}`, status: 'Todo', priority: 'Medium' },
            }),
          });
        });

        const t0 = performance.now();
        const responses = await Promise.all(requestBatch.map((req) => POST(req)));
        const totalDurationMs = performance.now() - t0;

        expect(responses.length).toBe(concurrency);
        for (const res of responses) {
          expect(res.status).toBe(200);
          expect(res.headers.get(HEADER_CORRELATION_ID)).toBe(`corr-load-${concurrency}`);
        }

        const avgDurationPerReq = totalDurationMs / concurrency;
        const throughputRps = (concurrency / totalDurationMs) * 1000;

        console.log(
          `[API LOAD POST /api/tasks] Concurrency: ${concurrency} | Total: ${totalDurationMs.toFixed(2)}ms | Avg/Req: ${avgDurationPerReq.toFixed(2)}ms | Est Throughput: ${throughputRps.toFixed(0)} req/s`
        );
      });
    });
  });

  describe('PUT /api/tasks/[id] — Concurrent Task Updates', () => {
    concurrencyLevels.forEach((concurrency) => {
      it(`evaluates ${concurrency} concurrent updates`, async () => {
        const { PUT } = await import('@/app/api/tasks/[id]/route');

        const requestBatch = Array.from({ length: concurrency }, (_, idx) => {
          return new NextRequest(`http://localhost:3000/api/tasks/task-${idx}`, {
            method: 'PUT',
            headers: {
              [HEADER_REQUEST_ID]: `req-update-${concurrency}-${idx}`,
              [HEADER_CORRELATION_ID]: `corr-update-${concurrency}`,
            },
            body: JSON.stringify({ status: 'In Progress', priority: 'High' }),
          });
        });

        const t0 = performance.now();
        const responses = await Promise.all(
          requestBatch.map((req, idx) => PUT(req, { params: Promise.resolve({ id: `task-${idx}` }) }))
        );
        const totalDurationMs = performance.now() - t0;

        expect(responses.length).toBe(concurrency);
        for (const res of responses) {
          expect(res.status).toBe(200);
          expect(res.headers.get(HEADER_CORRELATION_ID)).toBe(`corr-update-${concurrency}`);
        }

        const avgDurationPerReq = totalDurationMs / concurrency;
        const throughputRps = (concurrency / totalDurationMs) * 1000;

        console.log(
          `[API LOAD PUT /api/tasks/[id]] Concurrency: ${concurrency} | Total: ${totalDurationMs.toFixed(2)}ms | Avg/Req: ${avgDurationPerReq.toFixed(2)}ms | Est Throughput: ${throughputRps.toFixed(0)} req/s`
        );
      });
    });
  });
});

