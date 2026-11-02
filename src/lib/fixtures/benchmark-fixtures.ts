import { Task, TaskStatus, TaskPriority, User, Label } from '@/types'

export const BENCHMARK_USERS: User[] = [
  { id: 'user-bench-1', name: 'Alice Cooper', initials: 'AC', email: 'alice@syncora.io', role: 'Owner' },
  { id: 'user-bench-2', name: 'Bob Dylan', initials: 'BD', email: 'bob@syncora.io', role: 'Member' },
  { id: 'user-bench-3', name: 'Carol Danvers', initials: 'CD', email: 'carol@syncora.io', role: 'Member' },
  { id: 'user-bench-4', name: 'David Byrne', initials: 'DB', email: 'david@syncora.io', role: 'Admin' },
  { id: 'user-bench-5', name: 'Elena Rostova', initials: 'ER', email: 'elena@syncora.io', role: 'Member' },
]

export const BENCHMARK_LABELS: Label[] = [
  { id: 'lbl-1', name: 'Frontend', color: 'bg-blue-100 text-blue-700' },
  { id: 'lbl-2', name: 'Backend', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'lbl-3', name: 'Security', color: 'bg-red-100 text-red-700' },
  { id: 'lbl-4', name: 'Performance', color: 'bg-purple-100 text-purple-700' },
  { id: 'lbl-5', name: 'Release 17', color: 'bg-amber-100 text-amber-700' },
]

const STATUSES: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done']
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent']

const TITLES = [
  'Optimize virtualized list rendering pipeline and recycle unused row nodes',
  'Implement J/K vim navigation with focus trap isolation',
  'Refactor Zustand data-store selectors to prevent cascading component updates',
  'Harden workspace isolation boundaries and eradicate cross-tenant cache bleed',
  'Add AbortController request deduplication for global search input',
  'Evaluate IndexedDB vs Zustand in-memory acceleration layer',
  'Resolve layout shift in Kanban drag-and-drop with CSS containment boundaries',
  'Support G then H multi-key shortcut sequences with configurable timeout',
  'Fix edge case in optimistic rollback when server returns newer timestamp',
  'Enforce WCAG 2.1 AA focus order across virtualized table DOM elements',
]

export function generateBenchmarkTasks(
  count: number,
  options?: {
    workspaceId?: string
    projectIds?: string[]
    subtaskRatio?: number
  }
): Task[] {
  const workspaceId = options?.workspaceId || 'bench-ws-default'
  const projectIds = options?.projectIds || ['bench-proj-1', 'bench-proj-2', 'bench-proj-3']
  const subtaskRatio = options?.subtaskRatio ?? 0.15

  const tasks: Task[] = []
  const baseTimestamp = 1730000000000

  for (let i = 0; i < count; i++) {
    const id = `task-bench-${i + 1}`
    const status = STATUSES[i % STATUSES.length]
    const priority = PRIORITIES[i % PRIORITIES.length]
    const assignee = i % 7 === 0 ? undefined : BENCHMARK_USERS[i % BENCHMARK_USERS.length]
    const projectId = projectIds[i % projectIds.length]
    const title = `${TITLES[i % TITLES.length]} (#${i + 1})`
    const isSubtask = i > 10 && Math.random() < subtaskRatio
    const parentId = isSubtask ? tasks[Math.floor(Math.random() * Math.min(i, 50))].id : null

    const createdAt = new Date(baseTimestamp + i * 60000).toISOString()
    const dueDate = i % 3 === 0 ? new Date(baseTimestamp + (i + 100) * 86400000).toISOString() : undefined

    const labels: Label[] = []
    if (i % 2 === 0) labels.push(BENCHMARK_LABELS[i % BENCHMARK_LABELS.length])
    if (i % 5 === 0) labels.push(BENCHMARK_LABELS[(i + 2) % BENCHMARK_LABELS.length])

    tasks.push({
      id,
      title,
      description: `Detailed description for benchmark task #${i + 1} with context and testing specifications.`,
      status,
      priority,
      projectId,
      workspaceId,
      assignee,
      assigneeId: assignee?.id || null,
      labels,
      position: i,
      parentId,
      dueDate,
      createdAt,
      updatedAt: createdAt,
      estimatedHours: (i % 8) + 1,
      storyPoints: [1, 2, 3, 5, 8][i % 5],
      dependencies: [],
      blockedBy: [],
      attachments: [],
      watchers: [],
    })
  }

  return tasks
}
