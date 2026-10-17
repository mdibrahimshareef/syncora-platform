import { describe, it, expect, vi } from 'vitest';
import { createTraceContext, logStructuredAIEvent } from '../../../src/lib/ai/telemetry';
import { verifyWorkspaceAccess } from '../../../src/lib/ai/auth';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabase, createChainable } from '../mock-supabase';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}));

describe('Release 4.8 Observability: Trace Correlation & Security Boundaries (Section 4.1)', () => {
  it('creates trace context with consistent traceId and requestId', () => {
    const traceCtx = createTraceContext({
      workspaceId: 'ws-prod-1',
      userId: 'usr-42',
      jobId: 'job-99',
      workflowId: 'wf-77'
    });

    expect(traceCtx.traceId).toBeDefined();
    expect(traceCtx.requestId).toBeDefined();
    expect(traceCtx.workspaceId).toBe('ws-prod-1');
    expect(traceCtx.userId).toBe('usr-42');
    expect(traceCtx.jobId).toBe('job-99');
    expect(traceCtx.workflowId).toBe('wf-77');
  });

  it('preserves existing traceId across execution stages when provided', () => {
    const existingTraceId = 'trace-fixed-12345';
    const traceCtx = createTraceContext({
      workspaceId: 'ws-prod-1',
      traceId: existingTraceId,
      stepId: 'step-1'
    });

    expect(traceCtx.traceId).toBe(existingTraceId);
    expect(traceCtx.stepId).toBe('step-1');
  });

  it('CRITICAL SECURITY: Correlation IDs NEVER grant authorization to foreign workspaces', async () => {
    // An attacker creates or obtains a trace context with a valid traceId targeting another workspace
    const forgedTrace = createTraceContext({
      workspaceId: 'ws-victim-100',
      traceId: 'trace-forged-attacker'
    });

    // Mock an authenticated user who is NOT a member of ws-victim-100
    const mockSupabase = createMockSupabase();
    (mockSupabase as any).auth = {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-attacker', email: 'attacker@evil.com' } },
        error: null
      })
    };
    (mockSupabase as any).from = () => {
      // Querying workspaces returns null / forbidden for attacker
      return createChainable(null);
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    // The authorization guard must reject access regardless of the trace context
    await expect(verifyWorkspaceAccess(forgedTrace.workspaceId)).rejects.toThrow();
  });

  it('logs structured events with automatic environment stamping and redacted metadata', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logStructuredAIEvent({
      eventName: 'JOB_CLAIMED',
      traceContext: createTraceContext({
        workspaceId: 'ws-test',
        jobId: 'job-1'
      }),
      durationMs: 45,
      metadata: {
        safeField: 'ok',
        api_key: 'sk-secret123456789012345678901234'
      }
    });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedStr = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedStr);

    expect(parsed.eventName).toBe('JOB_CLAIMED');
    expect(parsed.traceContext.jobId).toBe('job-1');
    expect(parsed.durationMs).toBe(45);
    expect(parsed.metadata.safeField).toBe('ok');
    expect(parsed.metadata.api_key).toBe('[REDACTED]');

    consoleSpy.mockRestore();
  });
});
