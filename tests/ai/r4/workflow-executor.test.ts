import { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, vi } from 'vitest';
import { executeWorkflowPlan } from '../../../src/lib/ai/workflow-executor';
import * as actionExecutor from '../../../src/lib/ai/action-executor';
import { createMockSupabase, createChainable } from '../mock-supabase';

vi.stubGlobal('crypto', {
  randomUUID: () => 'test-executor'
});

// Mock Supabase
const mockSupabase = createMockSupabase({
  ai_workflows: () => {
    const chain = createChainable({ status: 'PENDING', executor_id: 'test-executor' });
    // When executing lease claim
    chain.update = vi.fn(() => createChainable({ status: 'EXECUTING', executor_id: 'test-executor' }));
    return chain;
  }
});

vi.mock('../../../src/lib/ai/action-executor', () => ({
  executeAction: vi.fn()
}));

describe('Workflow Executor (R4.1)', () => {
  it('halts immediately if dependency is missing', async () => {
    const plan = {
      title: 'Plan', description: 'desc',
      steps: [
        { stepId: 's1', tool: 'search', args: {}, dependsOn: ['missing'] }
      ]
    };
    
    const result = await executeWorkflowPlan(mockSupabase  as SupabaseClient, 'ws', 'user', plan );
    expect(result.status).toBe('PARTIALLY_COMPLETED');
    expect(result.error).toContain('missing was not completed');
  });

  it('executes steps sequentially', async () => {
    vi.mocked(actionExecutor.executeAction).mockResolvedValue({ status: 'completed', data: {} });
    
    const plan = {
      title: 'Plan', description: 'desc',
      steps: [
        { stepId: 's1', tool: 'search', args: {} },
        { stepId: 's2', tool: 'create_task', args: {}, dependsOn: ['s1'] }
      ]
    };
    
    const result = await executeWorkflowPlan(mockSupabase  as SupabaseClient, 'ws', 'user', plan );
    expect(result.status).toBe('COMPLETED');
    expect(result.completedSteps).toEqual(['s1', 's2']);
  });

  it('halts execution if a step fails', async () => {
    // Mock step 1 fails
    vi.mocked(actionExecutor.executeAction)
      .mockResolvedValueOnce({ status: 'failed', error: 'boom' });
      
    const plan = {
      title: 'Plan', description: 'desc',
      steps: [
        { stepId: 's1', tool: 'create_task', args: {} },
        { stepId: 's2', tool: 'update_task', args: {}, dependsOn: ['s1'] }
      ]
    };
    
    const result = await executeWorkflowPlan(mockSupabase  as SupabaseClient, 'ws', 'user', plan );
    expect(result.status).toBe('PARTIALLY_COMPLETED');
    expect(result.failedStep).toBe('s1');
    expect(result.completedSteps).toEqual([]);
    
    // Ensure step 2 never ran
    expect(actionExecutor.executeAction).toHaveBeenCalledTimes(1);
  });
});
