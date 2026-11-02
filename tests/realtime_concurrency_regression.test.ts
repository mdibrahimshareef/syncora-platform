import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '../src/stores/data-store'
import { generateBenchmarkTasks, BENCHMARK_USERS } from '../src/lib/fixtures/benchmark-fixtures'

describe('Platform Release 17 — Realtime & Concurrency Regression Tests', () => {
  beforeEach(() => {
    useDataStore.setState({
      activeWorkspaceId: 'ws-realtime-active',
      currentUser: BENCHMARK_USERS[0],
      workspaceMembers: BENCHMARK_USERS,
      tasks: [],
      workspaceTasks: [],
      projects: [{
        id: 'proj-rt-1',
        name: 'Realtime Consistency Project',
        description: '',
        status: 'Active',
        progress: 0,
        taskCount: 0,
        members: [BENCHMARK_USERS[0]],
        updatedAt: new Date().toISOString()
      }]
    })
  })

  it('rejects cross-workspace realtime events to prevent state leakage', () => {
    const task = generateBenchmarkTasks(1, { workspaceId: 'ws-realtime-active' })[0]
    useDataStore.setState({ tasks: [task], workspaceTasks: [task] })

    // Foreign event from different workspace
    const foreignPayload = {
      id: task.id,
      title: 'Hacked Cross-Tenant Title',
      workspace_id: 'ws-foreign-attacker',
      updated_at: new Date(Date.now() + 5000).toISOString()
    }

    useDataStore.getState().applyRealtimeTaskUpdate(foreignPayload)

    // Task must remain unchanged
    const current = useDataStore.getState().tasks[0]
    expect(current.title).toBe(task.title)
    expect(current.title).not.toContain('Hacked')
  })

  it('drops stale realtime events to prevent out-of-order overwrites', () => {
    const now = Date.now()
    const task = generateBenchmarkTasks(1, { workspaceId: 'ws-realtime-active' })[0]
    task.updatedAt = new Date(now).toISOString()
    task.title = 'Authoritative Modern Title'

    useDataStore.setState({ tasks: [task], workspaceTasks: [task] })

    // Stale payload with older timestamp
    const stalePayload = {
      id: task.id,
      title: 'Old Title That Was Delayed in Network',
      workspace_id: 'ws-realtime-active',
      updated_at: new Date(now - 10000).toISOString()
    }

    useDataStore.getState().applyRealtimeTaskUpdate(stalePayload)

    // Current title remains the newer one
    expect(useDataStore.getState().tasks[0].title).toBe('Authoritative Modern Title')
  })

  it('applies newer realtime updates correctly to virtualized data pool', () => {
    const now = Date.now()
    const tasks = generateBenchmarkTasks(50, { workspaceId: 'ws-realtime-active' })
    useDataStore.setState({ tasks, workspaceTasks: tasks })

    const target = tasks[15]
    const updatedPayload = {
      id: target.id,
      status: 'Done',
      workspace_id: 'ws-realtime-active',
      updated_at: new Date(now + 20000).toISOString()
    }

    useDataStore.getState().applyRealtimeTaskUpdate(updatedPayload)

    const updatedTask = useDataStore.getState().tasks.find(t => t.id === target.id)
    expect(updatedTask).toBeDefined()
    expect(updatedTask?.status).toBe('Done')
  })
})
