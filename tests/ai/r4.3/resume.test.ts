import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resumeWorkflowPlan } from '../../../src/lib/ai/workflow-executor';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock('../../../src/lib/ai/workflow-events', () => ({
  publishWorkflowEvent: vi.fn(),
  updateWorkflowState: vi.fn()
}));

describe('Workflow Resume (R4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('A. Failed workflow resumes correctly', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { status: 'FAILED', plan: { steps: [] } }, error: null }) // Initial fetch
      .mockResolvedValueOnce({ data: { status: 'RECOVERING' }, error: null }); // Concurrency lock

    // We expect it to proceed to execution without throwing
    const promise = resumeWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1');
    await expect(promise).resolves.not.toThrow();
  });

  it('G. Concurrent resume produces only one executor', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { status: 'FAILED', plan: { steps: [] } }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } }); // Concurrency lock fails because another process changed status

    await expect(resumeWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1')).rejects.toThrow('Workflow is currently executing or state changed. Cannot resume.');
  });

  it('M. Completed workflow cannot be resumed', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { status: 'COMPLETED' }, error: null });

    await expect(resumeWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1')).rejects.toThrow('Cannot resume workflow in COMPLETED state');
  });
});
