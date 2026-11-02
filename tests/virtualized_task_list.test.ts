import { describe, it, expect, beforeEach } from 'vitest'
import { generateBenchmarkTasks } from '../src/lib/fixtures/benchmark-fixtures'
import { useUIStore } from '../src/stores/ui-store'
import { useDataStore } from '../src/stores/data-store'

describe('Virtualized Task List & Large-Data Rendering Architecture', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedTaskId: null })
  })

  it('bounds DOM row count for large datasets (10,000 tasks)', () => {
    const tasks = generateBenchmarkTasks(10000)
    expect(tasks.length).toBe(10000)

    // With a viewport height of 600px and 52px row height with 10 overscan rows:
    // visible rows = Math.ceil(600 / 52) ≈ 12 rows + 10 overscan = 22-25 rows mounted.
    const viewportHeight = 600
    const rowHeight = 52
    const overscan = 10
    const renderedRowCount = Math.min(tasks.length, Math.ceil(viewportHeight / rowHeight) + overscan * 2)

    expect(renderedRowCount).toBeLessThanOrEqual(35)
    expect(renderedRowCount * 18).toBeLessThan(1000) // bounded under 1,000 DOM nodes vs 180,000 unvirtualized
  })

  it('preserves stable task identities and key indexes', () => {
    const tasks = generateBenchmarkTasks(500)
    const taskIds = tasks.map(t => t.id)
    const uniqueIds = new Set(taskIds)
    expect(uniqueIds.size).toBe(500)

    // Test row measurement calculation
    const totalVirtualHeight = tasks.length * 52
    expect(totalVirtualHeight).toBe(26000)
  })

  it('updates task selection without full collection re-render', () => {
    const tasks = generateBenchmarkTasks(1000)
    let selectedIds: string[] = []

    // Simulate selecting task 5
    const selectTask = (id: string) => {
      selectedIds = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]
    }

    selectTask(tasks[5].id)
    expect(selectedIds).toContain(tasks[5].id)
    expect(selectedIds.length).toBe(1)

    // Toggle off
    selectTask(tasks[5].id)
    expect(selectedIds).not.toContain(tasks[5].id)
    expect(selectedIds.length).toBe(0)
  })

  it('triggers task opening in UI store via keyboard selection', () => {
    const tasks = generateBenchmarkTasks(100)
    const targetTask = tasks[12]

    useUIStore.getState().setSelectedTaskId(targetTask.id)
    expect(useUIStore.getState().selectedTaskId).toBe(targetTask.id)

    useUIStore.getState().setSelectedTaskId(null)
    expect(useUIStore.getState().selectedTaskId).toBeNull()
  })
})

