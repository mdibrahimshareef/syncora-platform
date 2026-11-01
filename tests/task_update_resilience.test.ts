import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateTask } from '../src/lib/api/tasks'

describe('Task Update Resilience & Column Sanitization', () => {
  let mockSupabase: any
  let updateSpy: any
  let eqSpy: any

  beforeEach(() => {
    updateSpy = vi.fn().mockImplementation((data: any) => {
      return {
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: val,
                  project_id: data.project_id || 'proj-1',
                  workspace_id: data.workspace_id || 'ws-1',
                  title: data.title || 'Updated Task',
                  description: data.description || null,
                  status: data.status || 'Todo',
                  priority: data.priority || 'Medium',
                  assignee_id: data.assignee_id || null,
                  assignee: null,
                  due_date: data.due_date || null,
                  start_date: data.start_date || null,
                  position: data.position || 0,
                  parent_id: data.parent_id || null,
                  task_type: data.task_type || 'Task',
                  milestone_id: data.milestone_id || null,
                  document_id: data.document_id || null,
                  customer_id: data.customer_id || null,
                  request_id: data.request_id || null,
                  approval_id: data.approval_id || null,
                  estimated_time: data.estimated_time || null,
                  created_at: '2026-11-01T00:00:00.000Z',
                  updated_at: '2026-11-01T00:00:00.000Z'
                },
                error: null
              })
            })
          }
        })
      }
    })

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: updateSpy
      })
    }
  })

  it('maps camelCase fields to snake_case and filters out non-column properties like labels', async () => {
    const fullFormPayload = {
      title: 'Refactored Title',
      description: 'Refactored Description',
      status: 'In Progress',
      priority: 'High',
      projectId: 'proj-123',
      workspaceId: 'ws-456',
      assignee: { id: 'user-789', full_name: 'Alice' },
      assigneeId: 'user-789',
      startDate: '2026-11-02T10:00:00.000Z',
      dueDate: '2026-11-05T18:00:00.000Z',
      labels: ['bug', 'urgent'],
      position: 65536,
      parentId: null,
      estimatedTime: 3600,
      milestoneId: 'milestone-1',
      documentId: 'doc-1',
      taskType: 'Feature',
      // Non-column properties that might come from a Task object
      dependencies: [{ id: 'dep-1' }],
      blockedBy: [],
      attachments: [{ id: 'att-1' }],
      watchers: [{ userId: 'user-1' }],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z'
    }

    const result = await updateTask(mockSupabase, 'task-100', fullFormPayload as any)

    expect(updateSpy).toHaveBeenCalled()
    const capturedUpdatePayload = updateSpy.mock.calls[0][0]

    // Verify mapped snake_case columns
    expect(capturedUpdatePayload.project_id).toBe('proj-123')
    expect(capturedUpdatePayload.workspace_id).toBe('ws-456')
    expect(capturedUpdatePayload.start_date).toBe('2026-11-02T10:00:00.000Z')
    expect(capturedUpdatePayload.due_date).toBe('2026-11-05T18:00:00.000Z')
    expect(capturedUpdatePayload.assignee_id).toBe('user-789')
    expect(capturedUpdatePayload.milestone_id).toBe('milestone-1')
    expect(capturedUpdatePayload.document_id).toBe('doc-1')
    expect(capturedUpdatePayload.task_type).toBe('Feature')
    expect(capturedUpdatePayload.estimated_time).toBe(3600)
    expect(capturedUpdatePayload.updated_at).toBeDefined()

    // Verify non-column fields were stripped
    expect(capturedUpdatePayload.projectId).toBeUndefined()
    expect(capturedUpdatePayload.workspaceId).toBeUndefined()
    expect(capturedUpdatePayload.labels).toBeUndefined()
    expect(capturedUpdatePayload.assignee).toBeUndefined()
    expect(capturedUpdatePayload.assigneeId).toBeUndefined()
    expect(capturedUpdatePayload.startDate).toBeUndefined()
    expect(capturedUpdatePayload.dueDate).toBeUndefined()
    expect(capturedUpdatePayload.milestoneId).toBeUndefined()
    expect(capturedUpdatePayload.documentId).toBeUndefined()
    expect(capturedUpdatePayload.taskType).toBeUndefined()
    expect(capturedUpdatePayload.dependencies).toBeUndefined()
    expect(capturedUpdatePayload.blockedBy).toBeUndefined()
    expect(capturedUpdatePayload.attachments).toBeUndefined()
    expect(capturedUpdatePayload.watchers).toBeUndefined()
    expect(capturedUpdatePayload.createdAt).toBeUndefined()
    expect(capturedUpdatePayload.updatedAt).toBeUndefined()

    // Verify returned Task object has camelCase structure
    expect(result.id).toBe('task-100')
    expect(result.projectId).toBe('proj-123')
    expect(result.title).toBe('Refactored Title')
  })

  it('normalizes "none" values to null for nullable foreign key relations', async () => {
    const unlinkPayload = {
      milestoneId: 'none',
      documentId: 'none',
      customerId: 'none',
      requestId: 'none',
      approvalId: 'none',
      assigneeId: 'none',
      recurrenceRule: 'none',
      parentId: 'none'
    }

    await updateTask(mockSupabase, 'task-100', unlinkPayload as any)

    const capturedUpdatePayload = updateSpy.mock.calls[0][0]
    expect(capturedUpdatePayload.milestone_id).toBeNull()
    expect(capturedUpdatePayload.document_id).toBeNull()
    expect(capturedUpdatePayload.customer_id).toBeNull()
    expect(capturedUpdatePayload.request_id).toBeNull()
    expect(capturedUpdatePayload.approval_id).toBeNull()
    expect(capturedUpdatePayload.assignee_id).toBeNull()
    expect(capturedUpdatePayload.recurrence_rule).toBeNull()
    expect(capturedUpdatePayload.parent_id).toBeNull()
  })
})
