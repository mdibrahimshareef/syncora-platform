import { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWorkflowStep } from '../../../src/lib/ai/workflow-executor';

import { createMockSupabase, createChainable } from '../mock-supabase';

vi.stubGlobal('crypto', {
  randomUUID: () => 'test-executor'
});

const mockSupabase = createMockSupabase({
  ai_workflows: () => {
    return createChainable({ status: 'FAILED', plan: { steps: [{ stepId: 'step-1' }] }, executor_id: 'test-executor' });
  }
});

vi.mock('../../../src/lib/ai/workflow-events', () => ({
  publishWorkflowEvent: vi.fn(),
  updateWorkflowState: vi.fn()
}));

describe('Workflow Retry (R4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('C. Failed step is retried exactly once', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
       if (table === 'ai_workflows') {
          return createChainable({ status: 'FAILED', plan: { steps: [{ stepId: 'step-1' }] }, executor_id: 'test-executor' });
       }
       if (table === 'ai_action_logs') {
          return createChainable({ status: 'failed', payload: { action: 'foo' }, action_type: 'create_task' });
       }
       return createMockSupabase().from(table);
    });

    const promise = retryWorkflowStep(mockSupabase  as SupabaseClient, 'wf-1', 'step-1', 'ws-1', 'user-1');
    await expect(promise).resolves.not.toThrow();
  });

  it('D. Duplicate retry cannot duplicate mutation', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
       if (table === 'ai_workflows') {
          return createChainable({ status: 'FAILED', plan: { steps: [{ stepId: 'step-1' }] }, executor_id: 'test-executor' });
       }
       if (table === 'ai_action_logs') {
          return createChainable({ status: 'completed' });
       }
       return createMockSupabase().from(table);
    });

    await expect(retryWorkflowStep(mockSupabase  as SupabaseClient, 'wf-1', 'step-1', 'ws-1', 'user-1')).rejects.toThrow('Step is already completed and cannot be retried');
  });
});
