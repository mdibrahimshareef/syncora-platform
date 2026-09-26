import { describe, it, expect, vi } from 'vitest'
import { getAiTools } from '../../src/lib/ai/tools'

// Mock Supabase
// Mock Supabase
const mockChain: any = {}
mockChain.eq = vi.fn().mockReturnValue(mockChain)
mockChain.ilike = vi.fn().mockReturnValue(mockChain)
mockChain.lt = vi.fn().mockReturnValue(mockChain)
mockChain.neq = vi.fn().mockReturnValue(mockChain)
mockChain.not = vi.fn().mockReturnValue(mockChain)
mockChain.order = vi.fn().mockReturnValue(mockChain)
mockChain.limit = vi.fn().mockReturnValue(mockChain)
mockChain.single = vi.fn().mockReturnValue(mockChain)
mockChain.select = vi.fn().mockReturnValue(mockChain)
const mockFrom = vi.fn().mockReturnValue(mockChain)

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
    mockChain.limit.mockResolvedValue({ data: [{ id: 'task-1' }], error: null })
    await tools.search_tasks.execute({ limit: 10 }, {} as any)
    
    // Verify that the query explicitly filtered by workspaceA
    expect(mockChain.eq).toHaveBeenCalledWith('workspace_id', workspaceA)
  })
})

