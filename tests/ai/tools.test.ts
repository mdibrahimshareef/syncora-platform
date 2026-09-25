import { describe, it, expect, vi } from 'vitest'
import { getAiTools } from '../../src/lib/ai/tools'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      }))
    }))
  }))
}))

describe('AI Tools Registry', () => {
  const workspaceId = 'test-workspace-123'
  const tools = getAiTools(workspaceId)

  it('initializes tools with the correct workspace context', () => {
    expect(tools).toHaveProperty('get_workspace_summary')
    expect(tools).toHaveProperty('search_tasks')
    expect(tools).toHaveProperty('create_task')
  })

  it('action tools return a proposal state rather than executing', async () => {
    // Action tools must NOT execute directly to respect RLS and Confirmation flow
    const result = await tools.create_task.execute({
      title: 'Test Task'
    }, {} as any)
    
    expect(result).toEqual({
      status: 'proposal_ready',
      message: 'Action proposed to user for confirmation. Do not assume it has been executed yet.',
      proposed_action: { title: 'Test Task' }
    })
  })

  it('enforces schema parameters for search_tasks', () => {
    const searchTaskSchema = tools.search_tasks.parameters
    
    const validParams = { status: 'Todo', limit: 5 }
    const result = searchTaskSchema.safeParse(validParams)
    expect(result.success).toBe(true)
  })
})
