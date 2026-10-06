import { describe, it, expect, vi } from 'vitest';
import { updateWorkflowState, publishWorkflowEvent } from '../../../src/lib/ai/workflow-events';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis()
};

describe('Workflow Realtime Security (R4.2)', () => {
  it('enforces workspace isolation when updating workflow state', async () => {
    await updateWorkflowState(mockSupabase as any, 'wf-1', 'ws-locked', 'user-1', 'EXECUTING');
    
    // The eq('workspace_id', workspaceId) MUST be called to prevent cross-workspace tampering
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'wf-1');
    expect(mockSupabase.eq).toHaveBeenCalledWith('workspace_id', 'ws-locked');
  });

  it('enforces workspace isolation when publishing events', async () => {
    await publishWorkflowEvent(mockSupabase as any, {
      workflowId: 'wf-1',
      workspaceId: 'ws-locked',
      userId: 'user-1',
      eventType: 'STEP_STARTED',
      status: 'EXECUTING'
    });
    
    // The insert payload MUST contain the workspaceId
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'ws-locked'
    }));
  });
});
