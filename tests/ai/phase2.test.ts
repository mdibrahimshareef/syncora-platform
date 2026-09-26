import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deduplicateSources, resolveSourceUrl, AISource } from '../../src/lib/ai/sources'

// Mock createClient for Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: vi.fn((table) => {
      return {
        select: vi.fn(() => {
          return {
            eq: vi.fn((field, val) => {
              if (table === 'workspaces' && val === 'workspace-1') {
                return { single: vi.fn().mockResolvedValue({ data: { slug: 'ws', organization_id: 'org-1', team_id: 'team-1' } }) }
              }
              if (table === 'workspaces' && val === 'workspace-none') {
                return { single: vi.fn().mockResolvedValue({ data: { slug: 'ws-none' } }) } // no org or team
              }
              if (table === 'organizations' && val === 'org-1') {
                return { single: vi.fn().mockResolvedValue({ data: { slug: 'my-org' } }) }
              }
              if (table === 'teams' && val === 'team-1') {
                return { single: vi.fn().mockResolvedValue({ data: { slug: 'my-team' } }) }
              }
              if (table === 'tasks' && val === 'task-missing') {
                return { single: vi.fn().mockResolvedValue({ data: { project_id: 'proj-1' } }) }
              }
              return { single: vi.fn().mockResolvedValue({ data: null }) }
            })
          }
        })
      }
    })
  }))
}))

describe('Phase 2 - Source Attribution & Grounding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('R2-P2-A: deduplicateSources removes duplicates by entityId and prefers tool sources', () => {
    const sources: AISource[] = [
      { id: 'sem-1', entityId: 'task-1', type: 'task', title: 'Task', workspaceId: 'ws-1', sourceKind: 'semantic' },
      { id: 'sem-2', entityId: 'proj-1', type: 'project', title: 'Proj', workspaceId: 'ws-1', sourceKind: 'semantic' },
      { id: 'tool-1', entityId: 'task-1', type: 'task', title: 'Task DB', workspaceId: 'ws-1', sourceKind: 'tool' }, // Should override sem-1
      { id: 'tool-2', entityId: 'task-2', type: 'task', title: 'Task 2', workspaceId: 'ws-1', sourceKind: 'tool' }, // Unique
    ]

    const deduplicated = deduplicateSources(sources)
    
    expect(deduplicated).toHaveLength(3)
    
    // The tool source for task-1 should be preferred
    const task1 = deduplicated.find(s => s.entityId === 'task-1')
    expect(task1?.sourceKind).toBe('tool')
    expect(task1?.id).toBe('tool-1')
    
    // Proj-1 should remain semantic
    const proj1 = deduplicated.find(s => s.entityId === 'proj-1')
    expect(proj1?.sourceKind).toBe('semantic')
    expect(proj1?.id).toBe('sem-2')
  })

  it('R2-P2-B: resolveSourceUrl constructs valid canonical routes using workspace relations', async () => {
    // Tests resolveSourceUrl with the mocked supabase relations
    const projectUrl = await resolveSourceUrl('workspace-1', 'project', 'proj-1')
    expect(projectUrl).toBe('/my-org/my-team/ws/projects/proj-1')

    const taskUrlWithProject = await resolveSourceUrl('workspace-1', 'task', 'task-1', 'proj-1')
    expect(taskUrlWithProject).toBe('/my-org/my-team/ws/projects/proj-1?task=task-1')

    const taskUrlWithoutProject = await resolveSourceUrl('workspace-1', 'task', 'task-missing')
    expect(taskUrlWithoutProject).toBe('/my-org/my-team/ws/projects/proj-1?task=task-missing')

    const docUrl = await resolveSourceUrl('workspace-1', 'document', 'doc-1')
    expect(docUrl).toBe('/my-org/my-team/ws/docs/doc-1')
  })

  it('R2-P2-C: resolveSourceUrl handles missing relations gracefully', async () => {
    const projectUrl = await resolveSourceUrl('workspace-none', 'project', 'proj-1')
    expect(projectUrl).toBe('/org/team/ws-none/projects/proj-1') // falls back to defaults
  })
})
