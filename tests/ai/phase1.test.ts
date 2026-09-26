import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyIntent } from '../../src/lib/ai/intent'
import { getTemporalContext } from '../../src/lib/ai/time'
import { getAiTools } from '../../src/lib/ai/tools'

vi.mock('@/lib/supabase/server', () => ({
  createClient: function() { return {} }
}))

describe('AI R2 Phase 1: Intent Routing', () => {
  it('correctly classifies read intent', () => {
    expect(classifyIntent('what are my tasks?')).toBe('read')
  })
  it('correctly classifies search intent', () => {
    expect(classifyIntent('find the login bug task')).toBe('search')
  })
  it('correctly classifies action intent', () => {
    expect(classifyIntent('create a new task for API fix')).toBe('action')
  })
  it('correctly classifies analysis intent', () => {
    expect(classifyIntent('why is the project delayed?')).toBe('analysis')
  })
  it('correctly classifies mixed intent', () => {
    expect(classifyIntent('why is the project delayed and create a task')).toBe('mixed')
  })
})

describe('AI R2 Phase 1: Temporal Awareness', () => {
  it('provides deterministic temporal context', () => {
    const ctx = getTemporalContext()
    expect(ctx).toHaveProperty('serverNow')
    expect(ctx).toHaveProperty('currentDate')
    expect(ctx).toHaveProperty('startOfToday')
    expect(ctx).toHaveProperty('endOfToday')
  })
})

describe('AI R2 Phase 1: Tool Registry', () => {
  it('exposes robust granular read tools', () => {
    const tools = getAiTools('workspace-1', 'user-1')
    expect(tools).toHaveProperty('get_workspace_summary')
    expect(tools).toHaveProperty('search_tasks')
    expect(tools).toHaveProperty('get_project_health')
    expect(tools).toHaveProperty('get_team_workload')
  })

  it('preserves existing action proposals', () => {
    const tools = getAiTools('workspace-1', 'user-1')
    expect(tools).toHaveProperty('create_task')
    expect(tools).toHaveProperty('update_task')
    expect(tools).toHaveProperty('assign_task')
  })
})
