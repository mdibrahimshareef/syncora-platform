import { describe, it, expect, vi } from 'vitest'
import { getAiTools } from '../../src/lib/ai/tools'

vi.mock('@/lib/supabase/server', () => ({
  createClient: function() { return {} }
}))

describe('Action Confirmation Boundary', () => {
  it('returns a proposal state and never executes direct database mutation', async () => {
    const tools = getAiTools('workspace-123')
    
    // User says "Create a task called Fix login bug"
    const result = (await (tools.create_task as any).execute({ title: 'Fix login bug' }, {} as any)) as any
    
    // The action should NOT mutate anything, it should return a proposal
    expect(result.status).toBe('proposal_ready')
    expect(result.proposed_action.title).toBe('Fix login bug')
    expect(result.message).toContain('Action proposed to user for confirmation')
  })
})
