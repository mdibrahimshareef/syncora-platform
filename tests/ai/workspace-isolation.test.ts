import { describe, it, expect, vi } from 'vitest'
import { getAiTools } from '../../src/lib/ai/tools'

// Mock Supabase
const mockEq = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, eq: mockEq })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom
  }))
}))

describe('Workspace Isolation', () => {
  it('does not leak data from Workspace B when user is in Workspace A', async () => {
    const workspaceA = 'workspace-A-123'
    const tools = getAiTools(workspaceA)
    
    // Execute a read-only tool
    mockEq.mockResolvedValue({ data: [{ id: 'task-1' }], error: null })
    await tools.search_tasks.execute({ limit: 10 }, {} as any)
    
    // Verify that the query explicitly filtered by workspaceA
    expect(mockEq).toHaveBeenCalledWith('workspace_id', workspaceA)
  })
})

