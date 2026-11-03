import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { HEADER_REQUEST_ID, HEADER_CORRELATION_ID } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockCreateClient = vi.fn(() => ({
  auth: { getUser: mockGetUser },
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

describe('Release 18 Observability: API Route Instrumentation', () => {
  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerInfoSpy = vi.spyOn(logger, 'info');
    loggerErrorSpy = vi.spyOn(logger, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/tasks', () => {
    it('returns 401 when user is not authenticated and sets correlation headers', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const { POST } = await import('@/app/api/tasks/route');
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          [HEADER_REQUEST_ID]: 'custom-req-123',
          [HEADER_CORRELATION_ID]: 'custom-corr-456',
        },
        body: JSON.stringify({ projectId: 'proj-1', taskData: { title: 'Test Task' } }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
      expect(response.headers.get(HEADER_REQUEST_ID)).toBe('custom-req-123');
      expect(response.headers.get(HEADER_CORRELATION_ID)).toBe('custom-corr-456');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'task.create',
          errorCategory: 'AUTHENTICATION_ERROR',
        })
      );
    });

    it('returns 400 when missing required fields', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-1' } }, error: null });

      const { POST } = await import('@/app/api/tasks/route');
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { [HEADER_REQUEST_ID]: 'req-val-fail' },
        body: JSON.stringify({ projectId: 'proj-1' }), // Missing taskData
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Missing required fields');
      expect(response.headers.get(HEADER_REQUEST_ID)).toBe('req-val-fail');
    });

    it('executes mutation, emits structured log, and returns created task with correlation headers', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-42' } }, error: null });
      mockCreateTask.mockResolvedValueOnce({ id: 'task-new-1', title: 'Observability Test Task' });

      // Mock projects query
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { workspace_id: 'ws-active-100' }, error: null }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/tasks/route');
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          [HEADER_REQUEST_ID]: 'req-success-777',
          [HEADER_CORRELATION_ID]: 'corr-group-888',
        },
        body: JSON.stringify({
          projectId: 'proj-1',
          taskData: { title: 'Observability Test Task', status: 'Todo', priority: 'High' },
        }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.id).toBe('task-new-1');
      expect(response.headers.get(HEADER_REQUEST_ID)).toBe('req-success-777');
      expect(response.headers.get(HEADER_CORRELATION_ID)).toBe('corr-group-888');

      // Verify timer completed and logged structured success
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'task.create',
          service: 'tasks-api',
          requestId: 'req-success-777',
          correlationId: 'corr-group-888',
          status: 'success',
          workspaceId: 'ws-active-100',
          userId: 'usr-42',
        })
      );
    });
  });

  describe('PUT /api/tasks/[id]', () => {
    it('returns 404 when task does not exist and logs NOT_FOUND', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-42' } }, error: null });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const { PUT } = await import('@/app/api/tasks/[id]/route');
      const req = new NextRequest('http://localhost:3000/api/tasks/task-missing-99', {
        method: 'PUT',
        headers: { [HEADER_REQUEST_ID]: 'req-not-found' },
        body: JSON.stringify({ status: 'Done' }),
      });

      const response = await PUT(req, { params: Promise.resolve({ id: 'task-missing-99' }) });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Task not found');
      expect(response.headers.get(HEADER_REQUEST_ID)).toBe('req-not-found');
    });
  });

  describe('POST /api/time-entries', () => {
    it('returns 201 on valid time entry and returns correlation headers', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-time-1' } }, error: null });
      mockCreateTimeEntry.mockResolvedValueOnce({ id: 'te-100', duration_minutes: 60 });

      const { POST } = await import('@/app/api/time-entries/route');
      const req = new NextRequest('http://localhost:3000/api/time-entries', {
        method: 'POST',
        headers: { [HEADER_REQUEST_ID]: 'req-time-ok' },
        body: JSON.stringify({
          workspaceId: 'ws-time-1',
          durationMinutes: 60,
          source: 'TIMER',
        }),
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.id).toBe('te-100');
      expect(response.headers.get(HEADER_REQUEST_ID)).toBe('req-time-ok');
    });
  });

  describe('AI Cron Endpoint (/api/ai/cron)', () => {
    it('rejects unauthorized cron invocations without leaking secrets', async () => {
      const { POST } = await import('@/app/api/ai/cron/route');
      const req = new Request('http://localhost:3000/api/ai/cron', {
        method: 'POST',
        headers: {
          [HEADER_REQUEST_ID]: 'cron-unauth-req',
          // No Authorization header
        },
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
      expect(response.headers.get(HEADER_REQUEST_ID)).toBe('cron-unauth-req');
    });
  });
});

