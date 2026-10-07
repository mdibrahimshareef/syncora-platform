import { createMockSupabase, createChainable } from './mock-supabase'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/ai/action/execute/route'
import * as auth from '@/lib/ai/auth'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
vi.mock('@/lib/ai/auth', () => ({
  verifyWorkspaceAccess: vi.fn()
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

function createMockRequest(body: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  return {
    json: async () => body
  } as Request
}

describe('Phase 3 - Secure Action Execution', () => {
  let mockSupabase: any // eslint-disable-line @typescript-eslint/no-explicit-any
  let mockVerifyWorkspaceAccess: any // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    vi.clearAllMocks()

    mockVerifyWorkspaceAccess = vi.mocked(auth.verifyWorkspaceAccess)
    mockVerifyWorkspaceAccess.mockResolvedValue({
      user: { id: 'user-1' },
      workspace: { id: 'ws-1' }
    })


    mockSupabase = createMockSupabase({
      'ai_action_logs': () => createChainable(null), // default: no existing log
      'projects': () => createChainable({ id: 'proj-1' }),
      'tasks': () => createChainable({ id: 'task-1', status: 'Todo', assignee_id: 'user-1' }),
      'workspace_members': () => createChainable({ user_id: 'user-2' }), // assignee exists
      'activities': () => createChainable(null)
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
  })

  it('R2-P3-A: Rejects unauthenticated/unauthorized execution', async () => {
    mockVerifyWorkspaceAccess.mockRejectedValue(new Error('Unauthorized'))
    
    const req = createMockRequest({
      workspaceId: 'ws-unauth',
      toolName: 'create_task',
      actionId: 'action-1',
      args: { title: 'Test' }
    })
    
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.status).toBe('denied')
  })

  it('R2-P3-B: Rejects arbitrary action types', async () => {
    const req = createMockRequest({
      workspaceId: 'ws-1',
      toolName: 'delete_database',
      actionId: 'action-2',
      args: {}
    })
    
    const res = await POST(req)
    const json = await res.json()
    expect(json.data.error).toContain('is not supported')
  })

  it('R2-P3-C: Executes idempotent create_task successfully', async () => {
    const req = createMockRequest({
      workspaceId: 'ws-1',
      toolName: 'create_task',
      actionId: 'action-3',
      args: { title: 'New Task', priority: 'High' }
    })
    
    const res = await POST(req)
    const json = await res.json()
    
        expect(json.status).toBe('completed')
    expect(json.data.id).toBe('task-1')
    
    // Verify it checked the project
    expect(mockSupabase.from).toHaveBeenCalledWith('projects')
    // Verify it inserted into ai_action_logs twice (pending then completed)
    expect(mockSupabase.from).toHaveBeenCalledWith('ai_action_logs')
    // Verify it mutated tasks
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
  })

  it('R2-P3-D: Prevents duplicate execution on same actionId', async () => {
    // Mock that the action log already exists and is completed
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ai_action_logs') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({ data: { status: 'completed', result: { id: 'task-1' } } })
        }
        return chain
      }
      return { select: vi.fn() }
    })

    const req = createMockRequest({
      workspaceId: 'ws-1',
      toolName: 'create_task',
      actionId: 'action-3', // same ID
      args: { title: 'New Task' }
    })
    
    const res = await POST(req)
    const json = await res.json()
    
    expect(json.status).toBe('already_executed')
    // Should NOT have mutated tasks again
    expect(mockSupabase.from).not.toHaveBeenCalledWith('tasks')
  })

  it('R2-P3-E: Detects and rejects stale state (conflict)', async () => {
    const req = createMockRequest({
      workspaceId: 'ws-1',
      toolName: 'update_task',
      actionId: 'action-4',
      args: { 
        taskId: 'task-1', 
        updates: { status: 'Done' },
        expectedState: { status: 'In Progress' } // DB has 'Todo' in our mock
      }
    })
    
    const res = await POST(req)
    const json = await res.json()
    
    expect(json.status).toBe('conflict')
    expect(json.data.reason).toBe('stale_state')
  })

  it('R2-P3-F: Cross-workspace target mismatch is rejected', async () => {
    // Mock task returning null (simulate RLS or workspace mismatch)
    mockSupabase.from.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn(() => chain), // need insert for ai_action_logs
        update: vi.fn(() => chain)
      }
      return chain
    })

    const req = createMockRequest({
      workspaceId: 'ws-1',
      toolName: 'update_task',
      actionId: 'action-5',
      args: { taskId: 'task-other-ws', updates: { status: 'Done' } }
    })
    
    const res = await POST(req)
    const json = await res.json()
    
    expect(json.status).toBe('denied')
    expect(json.data.error).toContain('Task not found in this workspace')
  })
})
