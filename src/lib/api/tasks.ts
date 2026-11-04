import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { Task, TaskStatus, TaskDependency, TaskDependencyType, TaskAttachment } from "@/types"

interface RawProfileRelation {
  id: string
  full_name?: string | null
  avatar_url?: string | null
}

interface RawProjectRelation {
  workspace_id?: string | null
}

/**
 * Release 18 Phase 2 Optimization (Finding 17.1):
 * Demand-based task relation fetcher. Fetches dependencies, attachments, and watchers
 * for a single task on-demand when the user views task details.
 */
export async function getTaskRelations(supabase: SupabaseClient<Database>, taskId: string) {
  const [depsRes, attRes, watchRes] = await Promise.all([
    supabase
      .from('task_dependencies')
      .select('*')
      .or(`task_id.eq.${taskId},depends_on_task_id.eq.${taskId}`),
    supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId),
    supabase
      .from('task_watchers')
      .select('*')
      .eq('task_id', taskId),
  ])

  const dependencies: TaskDependency[] = []
  const attachments: TaskAttachment[] = []
  const watchers: { userId: string }[] = []

  if (!depsRes.error && depsRes.data) {
    for (const d of depsRes.data as Array<Record<string, unknown>>) {
      dependencies.push({
        id: d.id as string,
        taskId: d.task_id as string,
        dependsOnTaskId: d.depends_on_task_id as string,
        type: d.type as TaskDependencyType,
        createdAt: d.created_at as string,
      })
    }
  }

  if (!attRes.error && attRes.data) {
    for (const a of attRes.data as Array<Record<string, unknown>>) {
      attachments.push({
        id: a.id as string,
        taskId: a.task_id as string,
        workspaceId: a.workspace_id as string,
        fileName: a.file_name as string,
        fileSize: a.file_size as number,
        fileType: a.file_type as string,
        storagePath: a.storage_path as string,
        uploadedBy: a.uploaded_by as string,
        createdAt: a.created_at as string,
      })
    }
  }

  if (!watchRes.error && watchRes.data) {
    for (const w of watchRes.data as Array<Record<string, unknown>>) {
      watchers.push({
        userId: w.user_id as string,
      })
    }
  }

  return {
    dependencies: dependencies.filter(d => d.taskId === taskId),
    blockedBy: dependencies.filter(d => d.dependsOnTaskId === taskId),
    attachments,
    watchers,
  }
}

/**
 * Release 18 Phase 2 Optimization (Finding 17.1):
 * Bounded concurrency relation fetcher. Limits parallel chunk requests to prevent
 * connection pool exhaustion and sequential round-trip serialization.
 */
async function fetchTaskRelations(
  supabase: SupabaseClient<Database>,
  taskIds: string[],
  concurrencyLimit = 5
) {
  if (taskIds.length === 0) {
    return { dependencies: [] as TaskDependency[], attachments: [] as TaskAttachment[], watchers: [] as { taskId: string; userId: string }[] }
  }

  const BATCH_SIZE = 100
  const dependencies: TaskDependency[] = []
  const attachments: TaskAttachment[] = []
  const watchers: { taskId: string; userId: string }[] = []

  const chunks: string[][] = []
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    chunks.push(taskIds.slice(i, i + BATCH_SIZE))
  }

  for (let c = 0; c < chunks.length; c += concurrencyLimit) {
    const chunkWindow = chunks.slice(c, c + concurrencyLimit)
    await Promise.all(
      chunkWindow.map(async (chunk) => {
        const chunkStr = chunk.join(',')
        const [depsRes, attRes, watchRes] = await Promise.all([
          supabase
            .from('task_dependencies')
            .select('*')
            .or(`task_id.in.(${chunkStr}),depends_on_task_id.in.(${chunkStr})`),
          supabase.from('task_attachments').select('*').in('task_id', chunk),
          supabase.from('task_watchers').select('*').in('task_id', chunk),
        ])

        if (!depsRes.error && depsRes.data) {
          for (const d of depsRes.data as Array<Record<string, unknown>>) {
            dependencies.push({
              id: d.id as string,
              taskId: d.task_id as string,
              dependsOnTaskId: d.depends_on_task_id as string,
              type: d.type as TaskDependencyType,
              createdAt: d.created_at as string,
            })
          }
        }

        if (!attRes.error && attRes.data) {
          for (const a of attRes.data as Array<Record<string, unknown>>) {
            attachments.push({
              id: a.id as string,
              taskId: a.task_id as string,
              workspaceId: a.workspace_id as string,
              fileName: a.file_name as string,
              fileSize: a.file_size as number,
              fileType: a.file_type as string,
              storagePath: a.storage_path as string,
              uploadedBy: a.uploaded_by as string,
              createdAt: a.created_at as string,
            })
          }
        }

        if (!watchRes.error && watchRes.data) {
          for (const w of watchRes.data as Array<Record<string, unknown>>) {
            watchers.push({
              taskId: w.task_id as string,
              userId: w.user_id as string,
            })
          }
        }
      })
    )
  }

  return { dependencies, attachments, watchers }
}

export async function getTasks(
  supabase: SupabaseClient<Database>,
  projectId: string,
  options?: { includeRelations?: boolean }
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
      projects(workspace_id)
    `)
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) throw error

  const includeRelations = options?.includeRelations ?? false
  let relations = { dependencies: [] as TaskDependency[], attachments: [] as TaskAttachment[], watchers: [] as { taskId: string; userId: string }[] }
  if (includeRelations && data.length > 0) {
    const taskIds = data.map(t => t.id)
    relations = await fetchTaskRelations(supabase, taskIds)
  }
  const { dependencies, attachments, watchers } = relations

  return data.map((t: Record<string, unknown>) => {
    const taskId = t.id as string
    const assignee = t.assignee as RawProfileRelation | null | undefined
    const projectRef = t.projects as RawProjectRelation | RawProjectRelation[] | null | undefined
    const workspaceId = (Array.isArray(projectRef) ? projectRef[0]?.workspace_id : projectRef?.workspace_id) || (t.workspace_id as string)

    return {
      id: taskId,
      projectId: t.project_id as string,
      title: t.title as string,
      description: (t.description as string) || undefined,
      status: t.status as TaskStatus,
      priority: t.priority as import("@/types").TaskPriority,
      assignee: assignee ? {
        id: assignee.id,
        name: assignee.full_name || 'Unknown User',
        initials: (assignee.full_name || 'U').substring(0, 2).toUpperCase(),
        email: '',
        role: 'Member',
        avatarUrl: assignee.avatar_url || undefined
      } : undefined,
      dueDate: t.due_date as string || undefined,
      startDate: t.start_date as string || undefined,
      position: t.position as number,
      parentId: t.parent_id as string | null,
      workspaceId,
      taskType: t.task_type as string | undefined,
      reporterId: t.reporter_id as string | null,
      customerId: t.customer_id as string | null,
      requestId: t.request_id as string | null,
      approvalId: (t.approval_id as string) || undefined,
      documentId: (t.document_id as string) || undefined,
      estimatedHours: t.estimated_hours as number | undefined,
      storyPoints: t.story_points as number | undefined,
      recurrenceRule: t.recurrence_rule as string | null,
      isRecurring: t.is_recurring as boolean,
      nextOccurrence: t.next_occurrence as string | null,
      recurringParentId: t.recurring_parent_id as string | null,
      labels: [],
      dependencies: dependencies.filter(d => d.taskId === taskId),
      blockedBy: dependencies.filter(d => d.dependsOnTaskId === taskId),
      attachments: attachments.filter(a => a.taskId === taskId),
      watchers: watchers.filter(w => w.taskId === taskId).map(w => ({ userId: w.userId })),
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string,
      slaPriority: t.sla_priority as string | undefined,
      slaSeverity: t.sla_severity as string | undefined,
      responseTarget: t.response_target as string | undefined,
      resolutionTarget: t.resolution_target as string | undefined,
      slaStatus: t.sla_status as string | undefined,
      estimatedTime: t.estimated_time as number,
      trackedTime: t.tracked_time as number,
      estimatedCost: t.estimated_cost as number,
      actualCost: t.actual_cost as number
    }
  })
}

export async function getWorkspaceTasks(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  options?: { includeRelations?: boolean }
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
      projects!inner(workspace_id)
    `)
    .eq('projects.workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const includeRelations = options?.includeRelations ?? false
  let relations = { dependencies: [] as TaskDependency[], attachments: [] as TaskAttachment[], watchers: [] as { taskId: string; userId: string }[] }
  if (includeRelations && data.length > 0) {
    const taskIds = data.map(t => t.id)
    relations = await fetchTaskRelations(supabase, taskIds)
  }
  const { dependencies, attachments, watchers } = relations

  return data.map((t: Record<string, unknown>) => {
    const taskId = t.id as string
    const assignee = t.assignee as RawProfileRelation | null | undefined

    return {
      id: taskId,
      projectId: t.project_id as string,
      title: t.title as string,
      description: (t.description as string) || undefined,
      status: t.status as TaskStatus,
      priority: t.priority as import("@/types").TaskPriority,
      assignee: assignee ? {
        id: assignee.id,
        name: assignee.full_name || 'Unknown User',
        initials: (assignee.full_name || 'U').substring(0, 2).toUpperCase(),
        email: '',
        role: 'Member',
        avatarUrl: assignee.avatar_url || undefined
      } : undefined,
      dueDate: t.due_date as string || undefined,
      startDate: t.start_date as string || undefined,
      position: t.position as number,
      parentId: t.parent_id as string | null,
      workspaceId: workspaceId,
      taskType: t.task_type as string | undefined,
      reporterId: t.reporter_id as string | null,
      customerId: t.customer_id as string | null,
      requestId: t.request_id as string | null,
      approvalId: (t.approval_id as string) || undefined,
      documentId: (t.document_id as string) || undefined,
      estimatedHours: t.estimated_hours as number | undefined,
      storyPoints: t.story_points as number | undefined,
      recurrenceRule: t.recurrence_rule as string | null,
      isRecurring: t.is_recurring as boolean,
      nextOccurrence: t.next_occurrence as string | null,
      recurringParentId: t.recurring_parent_id as string | null,
      labels: [],
      dependencies: dependencies.filter(d => d.taskId === taskId),
      blockedBy: dependencies.filter(d => d.dependsOnTaskId === taskId),
      attachments: attachments.filter(a => a.taskId === taskId),
      watchers: watchers.filter(w => w.taskId === taskId).map(w => ({ userId: w.userId })),
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string,
      slaPriority: t.sla_priority as string | undefined,
      slaSeverity: t.sla_severity as string | undefined,
      responseTarget: t.response_target as string | undefined,
      resolutionTarget: t.resolution_target as string | undefined,
      slaStatus: t.sla_status as string | undefined,
      estimatedTime: t.estimated_time as number,
      trackedTime: t.tracked_time as number,
      estimatedCost: t.estimated_cost as number,
      actualCost: t.actual_cost as number
    }
  })
}


export async function createTask(
  supabase: SupabaseClient<Database>,
  projectId: string,
  payload: {
    title: string,
    description?: string,
    status: string,
    priority: string,
    assigneeId?: string | null,
    assignee?: { id: string } | string | null,
    startDate?: string | null,
    dueDate?: string | null,
    userId?: string,
    parentId?: string | null,
    workspaceId?: string | null,
    taskType?: string,
    reporterId?: string | null,
    customerId?: string | null,
    requestId?: string | null,
    approvalId?: string | null,
    documentId?: string | null,
    estimatedHours?: number,
    storyPoints?: number,
    milestoneId?: string | null,
    milestone_id?: string | null,
    estimatedTime?: number | null,
    estimated_time?: number | null
  }
) {
  // Get max position for the status
  let positionQuery = supabase
    .from('tasks')
    .select('position')
    .eq('project_id', projectId)
    .eq('status', payload.status)
    .order('position', { ascending: false })
    .limit(1)

  if (payload.parentId) {
    positionQuery = positionQuery.eq('parent_id', payload.parentId)
  } else {
    positionQuery = positionQuery.is('parent_id', null)
  }

  const { data: existingTasks } = await positionQuery

  const position = (existingTasks && existingTasks.length > 0) ? existingTasks[0].position + 65536 : 65536

  const assigneeId = payload.assigneeId ||
    (typeof payload.assignee === 'string' ? payload.assignee : payload.assignee?.id) ||
    null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertPayload: any = {
    project_id: projectId,
    title: payload.title,
    description: payload.description || null,
    status: payload.status,
    priority: payload.priority,
    assignee_id: assigneeId,
    start_date: payload.startDate || null,
    due_date: payload.dueDate || null,
    parent_id: payload.parentId || null,
    position,
    created_by: payload.userId || null,
    task_type: payload.taskType || 'Task',
    reporter_id: payload.reporterId || null,
    customer_id: payload.customerId || null,
    request_id: payload.requestId || null,
    approval_id: payload.approvalId || null,
    document_id: payload.documentId || null,
    milestone_id: payload.milestoneId || payload.milestone_id || null,
    estimated_time: payload.estimatedTime || payload.estimated_time || null,
    estimated_hours: payload.estimatedHours || 0,
    story_points: payload.storyPoints || 0
  }

  if (payload.workspaceId) {
    insertPayload.workspace_id = payload.workspaceId
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert([insertPayload])
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .single()

  if (error) throw error

  const assignee = data.assignee as RawProfileRelation | null | undefined

  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    description: data.description || undefined,
    status: data.status as TaskStatus,
    priority: data.priority as import("@/types").TaskPriority,
    assignee: assignee ? {
      id: assignee.id,
      name: assignee.full_name || 'Unknown User',
      initials: (assignee.full_name || 'U').substring(0, 2).toUpperCase(),
      email: '',
      role: 'Member',
      avatarUrl: assignee.avatar_url || undefined
    } : undefined,
    assigneeId: data.assignee_id || null,
    dueDate: data.due_date || undefined,
    startDate: data.start_date || undefined,
    position: data.position,
    parentId: data.parent_id || null,
    workspaceId: data.workspace_id || payload.workspaceId || '',
    taskType: data.task_type || 'Task',
    reporterId: data.reporter_id || null,
    customerId: data.customer_id || null,
    requestId: data.request_id || null,
    approvalId: data.approval_id || undefined,
    documentId: data.document_id || undefined,
    milestoneId: data.milestone_id || null,
    estimatedTime: data.estimated_time || null,
    estimatedHours: data.estimated_hours || undefined,
    storyPoints: data.story_points || undefined,
    recurrenceRule: data.recurrence_rule || null,
    isRecurring: data.is_recurring || false,
    nextOccurrence: data.next_occurrence || null,
    recurringParentId: data.recurring_parent_id || null,
    labels: [],
    dependencies: [],
    blockedBy: [],
    attachments: [],
    watchers: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

const ALLOWED_TASK_COLUMNS = new Set([
  'title',
  'description',
  'status',
  'priority',
  'project_id',
  'workspace_id',
  'assignee_id',
  'start_date',
  'due_date',
  'position',
  'parent_id',
  'task_type',
  'reporter_id',
  'customer_id',
  'request_id',
  'approval_id',
  'document_id',
  'milestone_id',
  'estimated_time',
  'tracked_time',
  'estimated_cost',
  'actual_cost',
  'estimated_hours',
  'story_points',
  'recurrence_rule',
  'is_recurring',
  'next_occurrence',
  'recurring_parent_id',
  'sla_priority',
  'sla_severity',
  'response_target',
  'resolution_target',
  'sla_status',
  'updated_at'
]);

export async function updateTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
  payload: Partial<{
    title: string, description: string, status: string, priority: string, assigneeId: string,
    startDate: string, dueDate: string, parentId: string | null, recurrenceRule: string | null,
    slaPriority: string, slaSeverity: string, responseTarget: string, resolutionTarget: string, slaStatus: string,
    estimatedTime: number, trackedTime: number, estimatedCost: number, actualCost: number,
    taskType: string, reporterId: string | null, customerId: string | null, requestId: string | null, approvalId: string | null, documentId: string | null,
    estimatedHours: number, storyPoints: number, milestoneId: string | null,
    projectId: string, workspaceId: string, isRecurring: boolean, nextOccurrence: string | null, recurringParentId: string | null
  }>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = { ...payload }

  if (raw.assigneeId !== undefined) {
    raw.assignee_id = raw.assigneeId === 'none' ? null : (raw.assigneeId || null)
    delete raw.assigneeId
  }
  if (raw.assignee !== undefined) {
    if (raw.assignee_id === undefined) {
      raw.assignee_id = raw.assignee ? (typeof raw.assignee === 'string' ? raw.assignee : raw.assignee.id) : null
    }
    delete raw.assignee
  }

  // Mapping camelCase to snake_case for database fields
  const mappings: Record<string, string> = {
    projectId: 'project_id',
    workspaceId: 'workspace_id',
    startDate: 'start_date',
    dueDate: 'due_date',
    parentId: 'parent_id',
    milestoneId: 'milestone_id',
    documentId: 'document_id',
    customerId: 'customer_id',
    requestId: 'request_id',
    approvalId: 'approval_id',
    recurrenceRule: 'recurrence_rule',
    isRecurring: 'is_recurring',
    nextOccurrence: 'next_occurrence',
    recurringParentId: 'recurring_parent_id',
    slaPriority: 'sla_priority',
    slaSeverity: 'sla_severity',
    responseTarget: 'response_target',
    resolutionTarget: 'resolution_target',
    slaStatus: 'sla_status',
    estimatedTime: 'estimated_time',
    trackedTime: 'tracked_time',
    estimatedCost: 'estimated_cost',
    actualCost: 'actual_cost',
    taskType: 'task_type',
    reporterId: 'reporter_id',
    estimatedHours: 'estimated_hours',
    storyPoints: 'story_points'
  }

  for (const [camel, snake] of Object.entries(mappings)) {
    if (raw[camel] !== undefined) {
      raw[snake] = raw[camel]
      delete raw[camel]
    }
  }

  // Normalize 'none' values for nullable relations
  const nullableRelationFields = [
    'milestone_id',
    'document_id',
    'customer_id',
    'request_id',
    'approval_id',
    'recurrence_rule',
    'parent_id',
    'assignee_id',
  ]
  for (const field of nullableRelationFields) {
    if (raw[field] === 'none') {
      raw[field] = null
    }
  }

  // Whitelist only valid columns on public.tasks table
  const updateData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (ALLOWED_TASK_COLUMNS.has(key) && value !== undefined) {
      updateData[key] = value
    }
  }
  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData as Database['public']['Tables']['tasks']['Update'])
    .eq('id', taskId)
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
    `)
    .single()

  if (error) throw error

  const assignee = data.assignee as RawProfileRelation | null | undefined

  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    description: data.description || undefined,
    status: data.status as TaskStatus,
    priority: data.priority as import("@/types").TaskPriority,
    assignee: assignee ? {
      id: assignee.id,
      name: assignee.full_name || 'Unknown User',
      initials: (assignee.full_name || 'U').substring(0, 2).toUpperCase(),
      email: '',
      role: 'Member',
      avatarUrl: assignee.avatar_url || undefined
    } : undefined,
    assigneeId: data.assignee_id || null,
    dueDate: data.due_date || undefined,
    startDate: data.start_date || undefined,
    position: data.position,
    parentId: data.parent_id || null,
    workspaceId: data.workspace_id || payload.workspaceId || '',
    taskType: data.task_type || 'Task',
    reporterId: data.reporter_id || null,
    customerId: data.customer_id || null,
    requestId: data.request_id || null,
    approvalId: data.approval_id || undefined,
    documentId: data.document_id || undefined,
    milestoneId: data.milestone_id || null,
    estimatedTime: data.estimated_time || null,
    estimatedHours: data.estimated_hours || undefined,
    storyPoints: data.story_points || undefined,
    recurrenceRule: data.recurrence_rule || null,
    isRecurring: data.is_recurring || false,
    nextOccurrence: data.next_occurrence || null,
    recurringParentId: data.recurring_parent_id || null,
    labels: [],
    dependencies: [],
    blockedBy: [],
    attachments: [],
    watchers: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export async function deleteTask(supabase: SupabaseClient<Database>, taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
  return true
}

export async function updateTaskPositions(
  supabase: SupabaseClient<Database>,
  updates: { id: string, status: TaskStatus, position: number, parentId?: string | null }[]
) {
  const promises = updates.map(update => {
    const updateObj: { status: TaskStatus; position: number; parent_id?: string | null } = { status: update.status, position: update.position }
    if (update.parentId !== undefined) {
      updateObj.parent_id = update.parentId
    }
    return supabase
      .from('tasks')
      .update(updateObj)
      .eq('id', update.id)
  })

  const results = await Promise.all(promises)

  const hasError = results.find(r => r.error)
  if (hasError) throw hasError.error
  return true
}

export async function addDependency(
  supabase: SupabaseClient<Database>,
  taskId: string,
  dependsOnTaskId: string,
  type: TaskDependencyType = 'blocking',
  userId: string
) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
      type,
      created_by: userId
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeDependency(
  supabase: SupabaseClient<Database>,
  dependencyId: string
) {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)

  if (error) throw error
  return true
}

export async function uploadAttachment(
  supabase: SupabaseClient<Database>,
  taskId: string,
  workspaceId: string,
  userId: string,
  file: File
) {
  // 1. Upload to storage
  const fileExt = file.name.split('.').pop()
  const filePath = `${workspaceId}/${taskId}/${Math.random().toString(36).substring(7)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // 2. Insert metadata
  const { data, error: dbError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      workspace_id: workspaceId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: filePath,
      uploaded_by: userId
    })
    .select()
    .single()

  if (dbError) throw dbError

  return {
    id: data.id,
    taskId: data.task_id,
    workspaceId: data.workspace_id,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    storagePath: data.storage_path,
    uploadedBy: data.uploaded_by,
    createdAt: data.created_at
  }
}

export async function deleteAttachment(
  supabase: SupabaseClient<Database>,
  attachmentId: string,
  storagePath: string
) {
  // 1. Delete from storage
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([storagePath])

  if (storageError) throw storageError

  // 2. Delete from DB
  const { error: dbError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId)

  if (dbError) throw dbError

  return true
}

export const bulkUpdateTasks = async (
  supabase: SupabaseClient<Database>,
  taskIds: string[],
  updates: { status?: Task['status'], priority?: Task['priority'] }
): Promise<void> => {
  if (!taskIds.length) return

  const dbUpdates: Database['public']['Tables']['tasks']['Update'] = {}
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority
  if (Object.keys(dbUpdates).length === 0) return

  dbUpdates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .in('id', taskIds)

  if (error) throw error
}

export const bulkDeleteTasks = async (
  supabase: SupabaseClient,
  taskIds: string[]
): Promise<void> => {
  if (!taskIds.length) return
  const { error } = await supabase
    .from('tasks')
    .delete()
    .in('id', taskIds)

  if (error) throw error
}

export async function toggleWatcher(
  supabase: SupabaseClient<Database>,
  taskId: string,
  userId: string,
  isWatching: boolean
) {
  if (isWatching) {
    const { error } = await supabase
      .from('task_watchers')
      .delete()
      .match({ task_id: taskId, user_id: userId })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('task_watchers')
      .insert({ task_id: taskId, user_id: userId })
    if (error) throw error
  }
}
