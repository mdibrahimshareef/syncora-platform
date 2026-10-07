import { describe, it, expect, vi } from 'vitest';
import { executeAction } from '../../../src/lib/ai/action-executor';

import { createMockSupabase, createChainable } from '../mock-supabase';

vi.mock('../../../src/lib/api/tasks', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 'task-123' }),
  updateTask: vi.fn().mockResolvedValue({ id: 'task-123' })
}));

describe('Workflow Verification (R4.1)', () => {
  it('returns EXECUTED_BUT_NOT_VERIFIED if DB read fails post-mutation', async () => {
    let callCount = 0;
    const mockSupabase = createMockSupabase({
      'projects': () => createChainable({ id: 'proj-1' }),
      'workspace_members': () => createChainable({ user_id: 'user-1' }),
      'tasks': () => {
        callCount++;
        if (callCount === 1) return createChainable(null);
        return createChainable(null);
      }
    });
    
    const chain = createChainable(null);
    chain.single = vi.fn().mockResolvedValue({ data: null }); // Verification fails!
    
    mockSupabase.from = vi.fn((table) => {
      if (table === 'ai_workspace_policies') return createChainable({ ai_enabled: true, max_budget_usd: 1000, max_daily_requests: 1000, allow_ai_task_creation: true });
      if (table === 'ai_usage_metrics') return createChainable({ usage_usd: 10 });
      if (table === 'ai_action_logs') return createChainable(null);
      if (table === 'projects' || table === 'workspace_members' || table === 'tasks') {
         if (table === 'projects') return createChainable({ id: 'proj-1' });
         if (table === 'workspace_members') return createChainable({ user_id: 'user-1' });
         return chain;
      }
      return chain;
    });
    const args = { title: 'Test Task', projectId: 'proj-1', assigneeId: 'user-1' };
    
    const result = await executeAction(mockSupabase as any /* eslint-disable-line @typescript-eslint/no-explicit-any */, 'ws-1', 'user-1', 'create_task', args);
    expect(result.status).toBe('executed_but_not_verified');
    expect((result as { error: string }).error).toContain('failed after task creation');
  });
});
