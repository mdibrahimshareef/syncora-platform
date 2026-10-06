import { describe, it, expect, vi } from 'vitest';
import { executeAction } from '../../../src/lib/ai/action-executor';

// Complete mock
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock('../../../src/lib/api/tasks', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 'task-123' }),
  updateTask: vi.fn().mockResolvedValue({ id: 'task-123' })
}));

describe('Workflow Verification (R4.1)', () => {
  it('returns EXECUTED_BUT_NOT_VERIFIED if DB read fails post-mutation', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'proj-1' } }) // Project exists
      .mockResolvedValueOnce({ data: { user_id: 'user-1' } }) // Assignee exists
      .mockResolvedValueOnce({ data: null }); // Verification fails!
      
    const args = { title: 'Test Task', projectId: 'proj-1', assigneeId: 'user-1' };
    
    const result = await executeAction(mockSupabase as any, 'ws-1', 'user-1', 'create_task', args);
    expect(result.status).toBe('executed_but_not_verified');
    expect((result as any).error).toContain('failed after task creation');
  });
});
