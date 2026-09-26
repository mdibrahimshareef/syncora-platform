import { describe, it, expect } from 'vitest'
import { getAiTools } from '../../src/lib/ai/tools'

describe('Action Confirmation Boundary', () => {
  it('returns a proposal state and never executes direct database mutation', async () => {
    const tools = getAiTools('workspace-123')
    
    // User says "Create a task called Fix login bug"
    const result = await tools.create_task.execute({ title: 'Fix login bug' }, {} as any)
    
    // The action should NOT mutate anything, it should return a proposal
    expect(result.status).toBe('proposal_ready')
    expect(result.proposed_action.title).toBe('Fix login bug')
    expect(result.message).toContain('Action proposed to user for confirmation')
  })
})
