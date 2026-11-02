import { useDataStore } from './data-store'
import { Task, Project } from '@/types'
import { useCallback, useMemo } from 'react'

/**
 * Platform Release 17: Fine-grained, memoized selectors for Zustand.
 * Prevents unnecessary re-renders across task cards, table rows, and headers.
 */

export function useTask(taskId: string | null | undefined): Task | undefined {
  return useDataStore(
    useCallback(
      (state) => {
        if (!taskId) return undefined
        return state.tasks.find((t) => t.id === taskId) || state.workspaceTasks.find((t) => t.id === taskId)
      },
      [taskId]
    )
  )
}

export function useProjectTasks(projectId: string | null | undefined): Task[] {
  return useDataStore(
    useCallback(
      (state) => {
        if (!projectId) return state.tasks
        return state.tasks.filter((t) => t.projectId === projectId)
      },
      [projectId]
    )
  )
}

export function useProjectById(projectId: string | null | undefined): Project | undefined {
  return useDataStore(
    useCallback(
      (state) => (projectId ? state.projects.find((p) => p.id === projectId) : undefined),
      [projectId]
    )
  )
}

export function useTaskCounts(projectId?: string): { total: number; done: number; inProgress: number; todo: number } {
  return useDataStore(
    useCallback(
      (state) => {
        const pool = projectId ? state.tasks.filter((t) => t.projectId === projectId) : state.tasks
        let done = 0
        let inProgress = 0
        let todo = 0
        for (const t of pool) {
          if (t.status === 'Done') done++
          else if (t.status === 'In Progress') inProgress++
          else todo++
        }
        return { total: pool.length, done, inProgress, todo }
      },
      [projectId]
    )
  )
}

export function useActiveWorkspaceId(): string | null {
  return useDataStore((state) => state.activeWorkspaceId)
}

export function useCurrentUser() {
  return useDataStore((state) => state.currentUser)
}

export function useWorkspaceMembers() {
  return useDataStore((state) => state.workspaceMembers)
}

export function useUnreadNotificationCount(): number {
  return useDataStore((state) => state.unreadNotificationCount)
}

