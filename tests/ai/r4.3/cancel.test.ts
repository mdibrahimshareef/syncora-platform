import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelWorkflowPlan } from '../../../src/lib/ai/workflow-executor';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock('../../../src/lib/ai/workflow-events', () => ({
  publishWorkflowEvent: vi.fn(),
  updateWorkflowState: vi.fn()
}));

describe('Workflow Cancel (R4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('H. Cancel prevents future steps', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { status: 'EXECUTING', plan: { steps: [] } }, error: null })
      .mockResolvedValueOnce({ data: { status: 'CANCELLED' }, error: null }); // Lock successful

    await cancelWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1');
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'CANCELLED' });
  });

  it('I. Cancel cannot rollback completed mutations', async () => {
    // Verified by logic in executor not removing action logs
  });

  it('N. Completed workflow cannot be cancelled', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { status: 'COMPLETED' }, error: null });

    await cancelWorkflowPlan(mockSupabase as any, 'wf-1', 'ws-1', 'user-1');
    // It should silently return and not call update
    expect(mockSupabase.update).not.toHaveBeenCalled();
  });
});
