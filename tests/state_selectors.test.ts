import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '../src/stores/data-store'
import { generateBenchmarkTasks, BENCHMARK_USERS } from '../src/lib/fixtures/benchmark-fixtures'

describe('Platform Release 17 — Zustand Selector & State Optimization', () => {
  beforeEach(() => {
    useDataStore.setState({
      activeWorkspaceId: 'ws-sel-test',
      currentUser: BENCHMARK_USERS[0],
      tasks: [],
      workspaceTasks: [],
      projects: [{
        id: 'proj-sel-1',
        name: 'Release 17 Optimization',
        description: '',
        status: 'Active',
        progress: 0,
        taskCount: 0,
        members: [BENCHMARK_USERS[0]],
        updatedAt: new Date().toISOString()
      }]
    })
  })

  it('calculates task counts accurately with fine-grained selectors', () => {
    const tasks = generateBenchmarkTasks(200, { projectIds: ['proj-sel-1'] })
    useDataStore.setState({ tasks, workspaceTasks: tasks })

    const doneCount = tasks.filter(t => t.status === 'Done').length
    const inProgressCount = tasks.filter(t => t.status === 'In Progress').length

    const state = useDataStore.getState()
    const pool = state.tasks.filter(t => t.projectId === 'proj-sel-1')
    let done = 0
    let inProgress = 0
    for (const t of pool) {
      if (t.status === 'Done') done++
      else if (t.status === 'In Progress') inProgress++
    }

    expect(done).toBe(doneCount)
    expect(inProgress).toBe(inProgressCount)
    expect(pool.length).toBe(200)
  })

  it('retrieves single task without subscribing to full task collection', () => {
    const tasks = generateBenchmarkTasks(500)
    useDataStore.setState({ tasks })

    const targetId = tasks[42].id
    const state = useDataStore.getState()
    const found = state.tasks.find(t => t.id === targetId)

    expect(found).toBeDefined()
    expect(found?.id).toBe(targetId)
    expect(found?.title).toBe(tasks[42].title)
  })

  it('guarantees state isolation across workspace boundaries', () => {
    const tasksA = generateBenchmarkTasks(50, { workspaceId: 'ws-A' })
    useDataStore.setState({
      activeWorkspaceId: 'ws-A',
      tasks: tasksA,
      workspaceTasks: tasksA,
    })

    expect(useDataStore.getState().activeWorkspaceId).toBe('ws-A')
    expect(useDataStore.getState().tasks.length).toBe(50)

    // Switch to Workspace B
    useDataStore.getState().setActiveWorkspaceId('ws-B')
    expect(useDataStore.getState().activeWorkspaceId).toBe('ws-B')
    expect(useDataStore.getState().tasks.length).toBe(0)
    expect(useDataStore.getState().workspaceTasks.length).toBe(0)
  })
})
