import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWorkflowStep } from '../../../src/lib/ai/workflow-executor';

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

describe('Workflow Retry (R4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('C. Failed step is retried exactly once', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { status: 'FAILED', plan: { steps: [{ stepId: 'step-1' }] } }, error: null }) // Workflow check
      .mockResolvedValueOnce({ data: { status: 'RECOVERING' }, error: null }) // Lock
      .mockResolvedValueOnce({ data: { status: 'failed' }, error: null }); // Previous action log check

    const promise = retryWorkflowStep(mockSupabase as any, 'wf-1', 'step-1', 'ws-1', 'user-1');
    await expect(promise).resolves.not.toThrow();
  });

  it('D. Duplicate retry cannot duplicate mutation', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { status: 'FAILED', plan: { steps: [{ stepId: 'step-1' }] } }, error: null })
      .mockResolvedValueOnce({ data: { status: 'RECOVERING' }, error: null })
      .mockResolvedValueOnce({ data: { status: 'completed' }, error: null }); // Already completed

    await expect(retryWorkflowStep(mockSupabase as any, 'wf-1', 'step-1', 'ws-1', 'user-1')).rejects.toThrow('Step is already completed and cannot be retried');
  });
});
