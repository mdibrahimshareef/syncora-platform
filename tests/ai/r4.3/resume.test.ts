import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resumeWorkflowPlan } from '../../../src/lib/ai/workflow-executor';

import { createMockSupabase, createChainable } from '../mock-supabase';

vi.mock('../../../src/lib/ai/workflow-events', () => ({
  publishWorkflowEvent: vi.fn(),
  updateWorkflowState: vi.fn()
}));

describe('Workflow Resume (R4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('A. Failed workflow resumes correctly', async () => {
    const chain = createChainable({ status: 'FAILED', plan: { steps: [] } });
    chain.update = vi.fn(() => createChainable({ status: 'RECOVERING' }));
    
    const mockSupabase = createMockSupabase({
      ai_workflows: () => chain
    });

    // We expect it to proceed to execution without throwing
    const promise = resumeWorkflowPlan(mockSupabase as unknown as import("@supabase/supabase-js").SupabaseClient, 'wf-1', 'ws-1', 'user-1');
    await expect(promise).resolves.not.toThrow();
  });

  it('G. Concurrent resume produces only one executor', async () => {
    const chain = createChainable({ status: 'FAILED', plan: { steps: [] } });
    chain.update = vi.fn(() => createChainable(null, { message: 'Row not found' } as Error));

    const mockSupabase = createMockSupabase({
      ai_workflows: () => chain
    });

    await expect(resumeWorkflowPlan(mockSupabase as unknown as import("@supabase/supabase-js").SupabaseClient, 'wf-1', 'ws-1', 'user-1')).rejects.toThrow('Workflow is currently executing or state changed. Cannot resume.');
  });

  it('M. Completed workflow cannot be resumed', async () => {
    const chain = createChainable({ status: 'COMPLETED' });

    const mockSupabase = createMockSupabase({
      ai_workflows: () => chain
    });

    await expect(resumeWorkflowPlan(mockSupabase as unknown as import("@supabase/supabase-js").SupabaseClient, 'wf-1', 'ws-1', 'user-1')).rejects.toThrow('Cannot resume workflow in COMPLETED state');
  });
});
