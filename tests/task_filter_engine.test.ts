import { describe, it, expect } from 'vitest'
import { generateBenchmarkTasks, BENCHMARK_USERS } from '../src/lib/fixtures/benchmark-fixtures'
import { filterTasks, sortTasks } from '../src/lib/tasks/task-filter-engine'

describe('Platform Release 17 — Task Filter & Stable Sort Engine', () => {
  const tasks = generateBenchmarkTasks(500)

  it('filters by single attribute: status', () => {
    const inProgress = filterTasks(tasks, { statuses: ['In Progress'] })
    expect(inProgress.length).toBeGreaterThan(0)
    expect(inProgress.every(t => t.status === 'In Progress')).toBe(true)
  })

  it('filters by multiple combined attributes: status AND priority', () => {
    const combined = filterTasks(tasks, {
      statuses: ['In Progress'],
      priorities: ['Urgent', 'High']
    })
    expect(combined.length).toBeGreaterThan(0)
    expect(combined.every(t => t.status === 'In Progress' && (t.priority === 'Urgent' || t.priority === 'High'))).toBe(true)
  })

  it('filters by assignee', () => {
    const user = BENCHMARK_USERS[0]
    const assigned = filterTasks(tasks, { assigneeIds: [user.id] })
    expect(assigned.length).toBeGreaterThan(0)
    expect(assigned.every(t => t.assignee?.id === user.id)).toBe(true)
  })

  it('filters by substring query in title', () => {
    const searchMatch = filterTasks(tasks, { search: 'Zustand' })
    expect(searchMatch.length).toBeGreaterThan(0)
    expect(searchMatch.every(t => t.title.toLowerCase().includes('zustand'))).toBe(true)
  })

  it('performs stable sorting by priority descending', () => {
    const sorted = sortTasks(tasks, { field: 'priority', direction: 'desc' })
    expect(sorted.length).toBe(tasks.length)

    // First task should be Urgent
    expect(sorted[0].priority).toBe('Urgent')
    // Last task should be Low
    expect(sorted[sorted.length - 1].priority).toBe('Low')

    // Deterministic ordering: same array sorted twice produces identical order
    const sortedAgain = sortTasks(tasks, { field: 'priority', direction: 'desc' })
    expect(sorted.map(t => t.id)).toEqual(sortedAgain.map(t => t.id))
  })

  it('performs stable sorting by title ascending', () => {
    const sorted = sortTasks(tasks, { field: 'title', direction: 'asc' })
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].title.localeCompare(sorted[i + 1].title)).toBeLessThanOrEqual(0)
    }
  })
})
