import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataStore } from '../src/stores/data-store'
import { Task, User } from '../src/types'

// Mock createClient
vi.mock('@/lib/supabase/client', () => {
  const chain: any = {
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
  }
  return {
    createClient: () => ({
      from: () => ({
        select: () => chain,
        insert: () => Promise.resolve({ data: null, error: null }),
      })
    })
  }
})

describe('Task Creation & Realtime Deduplication', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'Ibrahim',
    initials: 'IB',
    email: 'ibrahim@example.com',
    role: 'Owner'
  }

  beforeEach(() => {
    useDataStore.setState({
      currentUser: mockUser,
      activeWorkspaceId: 'ws-1',
      workspaceMembers: [mockUser],
      tasks: [],
      workspaceTasks: [],
      projects: [{
        id: 'proj-1',
        name: 'Simple Restaurant Management Application.',
        description: '',
        status: 'Active',
        progress: 0,
        taskCount: 0,
        members: [mockUser],
        updatedAt: new Date().toISOString()
      }]
    })
  })

  it('applyRealtimeTaskInsert replaces in-flight optimistic task and preserves assignee', () => {
    const store = useDataStore.getState()
    
    // Simulate optimistic task added by createTask
    const tempId = 'temp-12345'
    const optimisticTask: Task = {
      id: tempId,
      projectId: 'proj-1',
      workspaceId: 'ws-1',
      title: 'Task-2',
      description: 'Restaurant management task',
      status: 'In Progress',
      priority: 'Medium',
      position: 65536,
      assignee: mockUser,
      assigneeId: mockUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: [],
      blockedBy: [],
      attachments: []
    }

    useDataStore.setState({
      tasks: [optimisticTask],
      workspaceTasks: [optimisticTask]
    })

    // Now simulate Realtime INSERT event arriving before HTTP response completes
    store.applyRealtimeTaskInsert({
      id: 'real-db-uuid-1',
      project_id: 'proj-1',
      workspace_id: 'ws-1',
      title: 'Task-2',
      description: 'Restaurant management task',
      status: 'In Progress',
      priority: 'Medium',
      position: 65536,
      assignee_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    const state = useDataStore.getState()
    
    // Should have exactly 1 task (not 2!), with real-db-uuid-1
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].id).toBe('real-db-uuid-1')
    expect(state.tasks[0].title).toBe('Task-2')
    // Assignee must be preserved!
    expect(state.tasks[0].assignee?.name).toBe('Ibrahim')

    expect(state.workspaceTasks).toHaveLength(1)
    expect(state.workspaceTasks[0].id).toBe('real-db-uuid-1')
  })

  it('second realtime event on the same task ID is ignored', () => {
    const store = useDataStore.getState()

    store.applyRealtimeTaskInsert({
      id: 'task-realtime-1',
      project_id: 'proj-1',
      workspace_id: 'ws-1',
      title: 'web-Design',
      status: 'Todo',
      priority: 'Medium',
      position: 65536,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    expect(useDataStore.getState().tasks).toHaveLength(1)

    // Second event arrives (e.g. from both useWorkspaceRealtime and useProjectRealtime)
    store.applyRealtimeTaskInsert({
      id: 'task-realtime-1',
      project_id: 'proj-1',
      workspace_id: 'ws-1',
      title: 'web-Design',
      status: 'Todo',
      priority: 'Medium',
      position: 65536,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    expect(useDataStore.getState().tasks).toHaveLength(1)
    expect(useDataStore.getState().workspaceTasks).toHaveLength(1)
  })

  it('resolves member from workspaceMembers even if realtime payload only has assignee_id', () => {
    const store = useDataStore.getState()

    store.applyRealtimeTaskInsert({
      id: 'task-external-create',
      project_id: 'proj-1',
      workspace_id: 'ws-1',
      title: 'Cook food',
      status: 'Todo',
      priority: 'High',
      position: 65536,
      assignee_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    const task = useDataStore.getState().tasks[0]
    expect(task.assignee).toBeDefined()
    expect(task.assignee?.name).toBe('Ibrahim')
    expect(task.assignee?.email).toBe('ibrahim@example.com')
  })

  it('createTask gracefully deduplicates when Realtime insert arrives before fetch completes', async () => {
    const store = useDataStore.getState()

    // Mock fetch to simulate server response delayed by 20ms
    global.fetch = vi.fn().mockImplementation(async () => {
      // While fetch is pending, Realtime insert fires!
      store.applyRealtimeTaskInsert({
        id: 'real-db-task-999',
        project_id: 'proj-1',
        workspace_id: 'ws-1',
        title: 'Task-2',
        description: 'New food menu',
        status: 'In Progress',
        priority: 'Medium',
        position: 65536,
        assignee_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      return {
        ok: true,
        json: async () => ({
          id: 'real-db-task-999',
          projectId: 'proj-1',
          workspaceId: 'ws-1',
          title: 'Task-2',
          description: 'New food menu',
          status: 'In Progress',
          priority: 'Medium',
          assignee: mockUser,
          assigneeId: mockUser.id,
          position: 65536,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    })

    await store.createTask({
      title: 'Task-2',
      description: 'New food menu',
      status: 'In Progress',
      priority: 'Medium',
      projectId: 'proj-1',
      workspaceId: 'ws-1',
      assignee: mockUser,
      assigneeId: mockUser.id,
      position: 0,
      labels: []
    })

    const state = useDataStore.getState()

    // MUST NOT create duplicate tasks!
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].id).toBe('real-db-task-999')
    expect(state.tasks[0].assignee?.name).toBe('Ibrahim')
    expect(state.workspaceTasks).toHaveLength(1)
    expect(state.workspaceTasks[0].id).toBe('real-db-task-999')
  })
})
