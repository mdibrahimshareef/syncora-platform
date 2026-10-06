import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resumeWorkflowPlan, cancelWorkflowPlan } from '../../../src/lib/ai/workflow-executor';

// Mock dependencies
vi.mock('../../../src/lib/ai/workflow-events', () => ({
  publishWorkflowEvent: vi.fn(),
  updateWorkflowState: vi.fn()
}));

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
};

describe('Workflow Recovery & Cancellation (R4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents resuming a COMPLETED workflow', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { status: 'COMPLETED', plan: { steps: [] } },
      error: null
    });

    await expect(resumeWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1'))
      .rejects.toThrow('Cannot resume workflow in COMPLETED state');
  });

  it('prevents resuming a CANCELLED workflow', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { status: 'CANCELLED', plan: { steps: [] } },
      error: null
    });

    await expect(resumeWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1'))
      .rejects.toThrow('Cannot resume workflow in CANCELLED state');
  });

  it('ignores cancellation if workflow is already COMPLETED', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { status: 'COMPLETED', plan: { steps: [] } },
      error: null
    });

    await cancelWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1');
    // If it throws, the test fails. It should just return.
    expect(mockSupabase.from).toHaveBeenCalledWith('ai_workflows');
  });

  it('throws error if workflow does not exist on resume', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' }
    });

    await expect(resumeWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1'))
      .rejects.toThrow('Workflow not found or access denied');
  });
});
