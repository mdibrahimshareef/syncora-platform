import { Task, TaskPriority, TaskStatus } from '@/types'

export interface TaskFilterOptions {
  search?: string
  statuses?: TaskStatus[] | string[]
  priorities?: TaskPriority[] | string[]
  assigneeIds?: string[]
  labelIds?: string[]
}

export type TaskSortField = 'position' | 'dueDate' | 'priority' | 'status' | 'createdAt' | 'title'
export type SortDirection = 'asc' | 'desc'

export interface TaskSortOptions {
  field: TaskSortField
  direction: SortDirection
}

const PRIORITY_RANK: Record<string, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

const STATUS_RANK: Record<string, number> = {
  Backlog: 1,
  Todo: 2,
  'In Progress': 3,
  Review: 4,
  Done: 5,
}

/**
 * Platform Release 17: Pure composable filter engine for tasks.
 * Optimized for $O(N)$ single-pass evaluation across large in-memory collections.
 */
export function filterTasks(tasks: Task[], options: TaskFilterOptions): Task[] {
  const query = options.search?.trim().toLowerCase()
  const hasQuery = Boolean(query && query.length > 0)
  const hasStatuses = Boolean(options.statuses && options.statuses.length > 0)
  const hasPriorities = Boolean(options.priorities && options.priorities.length > 0)
  const hasAssignees = Boolean(options.assigneeIds && options.assigneeIds.length > 0)
  const hasLabels = Boolean(options.labelIds && options.labelIds.length > 0)

  // Fast path: if no filters active, return original array
  if (!hasQuery && !hasStatuses && !hasPriorities && !hasAssignees && !hasLabels) {
    return tasks
  }

  return tasks.filter((task) => {
    // 1. Text substring match (title & description)
    if (hasQuery) {
      const matchTitle = task.title.toLowerCase().includes(query!)
      const matchDesc = task.description ? task.description.toLowerCase().includes(query!) : false
      if (!matchTitle && !matchDesc) return false
    }

    // 2. Status match
    if (hasStatuses && !options.statuses!.includes(task.status)) {
      return false
    }

    // 3. Priority match
    if (hasPriorities && !options.priorities!.includes(task.priority)) {
      return false
    }

    // 4. Assignee match
    if (hasAssignees) {
      const assigneeId = task.assignee?.id || task.assigneeId
      if (!assigneeId || !options.assigneeIds!.includes(assigneeId)) {
        return false
      }
    }

    // 5. Label match
    if (hasLabels) {
      const taskLabelIds = task.labels?.map((l) => l.id) || []
      const hasMatchingLabel = options.labelIds!.some((id) => taskLabelIds.includes(id))
      if (!hasMatchingLabel) return false
    }

    return true
  })
}

/**
 * Platform Release 17: Stable sorting engine for task collections.
 * Uses deterministic tie-breaking (by position or id) to prevent pagination jumping.
 */
export function sortTasks(tasks: Task[], sort: TaskSortOptions): Task[] {
  const dir = sort.direction === 'asc' ? 1 : -1

  return [...tasks].sort((a, b) => {
    let cmp = 0

    switch (sort.field) {
      case 'position':
        cmp = (a.position ?? 0) - (b.position ?? 0)
        break
      case 'dueDate': {
        const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0
        const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0
        cmp = timeA - timeB
        break
      }
      case 'createdAt': {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        cmp = timeA - timeB
        break
      }
      case 'priority': {
        const rankA = PRIORITY_RANK[a.priority] || 0
        const rankB = PRIORITY_RANK[b.priority] || 0
        cmp = rankA - rankB
        break
      }
      case 'status': {
        const rankA = STATUS_RANK[a.status] || 0
        const rankB = STATUS_RANK[b.status] || 0
        cmp = rankA - rankB
        break
      }
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
      default:
        cmp = 0
    }

    if (cmp !== 0) return cmp * dir

    // Deterministic tie-breaker: fallback to stable position or ID comparison
    return (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id)
  })
}
