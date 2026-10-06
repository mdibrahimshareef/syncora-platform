import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { AISource, resolveSourceUrl } from './sources'

const emptySchema = z.object({})
const searchTasksSchema = z.object({
  query: z.string().optional().describe('Search query for task title.'),
  projectId: z.string().optional().describe('Filter by Project ID.'),
  assigneeId: z.string().optional().describe('Filter by Assignee ID.'),
  status: z.string().optional().describe('Filter by task status (e.g., Todo, In Progress, Blocked).'),
  priority: z.string().optional().describe('Filter by task priority.'),
  isOverdue: z.boolean().optional().describe('Filter for overdue tasks.'),
  limit: z.number().default(20)
})
const taskIdSchema = z.object({ taskId: z.string() })
const projectIdListSchema = z.object({ projectId: z.string().optional(), limit: z.number().default(20) })
const projectIdSchema = z.object({ projectId: z.string().describe('The ID of the project.') })
const timeEntriesSchema = z.object({
  projectId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.number().default(15)
})
const automationStatusSchema = z.object({
  automationId: z.string().optional(),
  limit: z.number().default(10)
})

export const createTaskSchema = z.object({
  title: z.string().describe('The title of the task to create.'),
  projectId: z.string().optional().describe('The ID of the project this task belongs to.'),
  assigneeId: z.string().optional().describe('The user ID of the assignee.'),
  dueDate: z.string().optional().describe('The due date in YYYY-MM-DD format.'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().describe('The priority of the task.'),
  description: z.string().optional().describe('A brief description of the task.')
})

export const updateTaskSchema = z.object({
  taskId: z.string().describe('The ID of the task to update.'),
  updates: z.object({
    title: z.string().optional(),
    status: z.string().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
    dueDate: z.string().optional(),
    assigneeId: z.string().optional(),
  }).describe('The fields to update.'),
  expectedState: z.object({
    status: z.string().optional(),
    assigneeId: z.string().optional()
  }).optional().describe('The expected current state of the task before updating, to prevent stale overrides.')
})

export const assignTaskSchema = z.object({
  taskId: z.string().describe('The ID of the task.'),
  assigneeId: z.string().describe('The user ID of the assignee.'),
  expectedState: z.object({
    assigneeId: z.string().optional().nullable()
  }).optional().describe('The expected current assignee before updating, to prevent stale overrides.')
})

export function getAiTools(workspaceId: string, userId?: string) {
  return {
    // --- READ ONLY TOOLS ---
    get_workspace_summary: tool({
      description: 'Get a summary of the workspace, including project count, task count, and active members.',
      parameters: emptySchema,
      // @ts-ignore
      execute: async () => {
        const supabase = await createClient()
        const [projects, tasks, members] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('status', 'Done'),
          supabase.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        ])
        
        const sources: AISource[] = [{
          id: `workspace-summary-${workspaceId}`,
          entityId: workspaceId,
          type: 'workspace',
          title: 'Workspace Summary',
          description: `Projects: ${projects.count}, Tasks: ${tasks.count}, Members: ${members.count}`,
          workspaceId,
          sourceKind: 'analysis',
          url: await resolveSourceUrl(workspaceId, 'workspace', workspaceId)
        }]

        return {
          totalProjects: projects.count,
          openTasks: tasks.count,
          totalMembers: members.count,
          sources
        }
      }
    }),
    get_workspace_insights: tool({
      description: 'Get deterministic, proactive insights about workspace risks, such as workload imbalances, overdue tasks, and stale projects.',
      parameters: z.object({}),
      // @ts-ignore
      execute: async () => {
        const supabase = await createClient();
        const insights = [];
        
        // Overdue Work
        const { data: overdue } = await supabase.from('tasks').select('id, title, project_id').eq('workspace_id', workspaceId).lt('due_date', new Date().toISOString()).neq('status', 'Done');
        if (overdue && overdue.length > 0) {
          insights.push({
            type: 'Deadline Risk',
            severity: overdue.length > 5 ? 'High' : 'Medium',
            title: 'Overdue Work Detected',
            explanation: `${overdue.length} tasks are currently overdue.`,
            timestamp: new Date().toISOString(),
            workspaceId
          });
        }
        
        // Unassigned Work
        const { data: unassigned } = await supabase.from('tasks').select('id').eq('workspace_id', workspaceId).is('assignee_id', null).neq('status', 'Done');
        if (unassigned && unassigned.length > 0) {
          insights.push({
            type: 'Unassigned Work',
            severity: unassigned.length > 10 ? 'High' : 'Low',
            title: 'Unassigned Tasks Pending',
            explanation: `${unassigned.length} active tasks currently have no assignee.`,
            timestamp: new Date().toISOString(),
            workspaceId
          });
        }

        const sources: AISource[] = [{
          id: `insights-${workspaceId}`,
          entityId: workspaceId,
          type: 'workspace',
          title: 'Workspace Insights',
          workspaceId,
          sourceKind: 'analysis',
          url: await resolveSourceUrl(workspaceId, 'workspace', workspaceId)
        }];
        
        return { success: true, data: insights, sources };
      }
    }),

    get_my_work: tool({
      description: 'Get tasks assigned specifically to the authenticated user. Use this to answer questions about the user\'s own workload, priorities, and deadlines. Prioritizes active, overdue, and upcoming tasks.',
      parameters: z.object({ limit: z.number().default(20) }),
      // @ts-ignore
      execute: async (args) => {
        if (!userId) return { success: false, errorCode: 'UNAUTHORIZED', message: 'User context is missing.' }
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, project_id')
          .eq('workspace_id', workspaceId)
          .eq('assignee_id', userId)
          .neq('status', 'Done')
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(Math.min(args.limit, 50))
          
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = await Promise.all((data || []).map(async (task: any) => ({
          id: `task-${task.id}`,
          entityId: task.id,
          type: 'task',
          title: task.title,
          workspaceId,
          sourceKind: 'tool',
          url: await resolveSourceUrl(workspaceId, 'task', task.id, task.project_id)
        })))

        return { success: true, data: data || [], sources }
      }
    }),

    get_projects: tool({
      description: 'Get a list of all active projects in the workspace.',
      parameters: emptySchema,
      // @ts-ignore
      execute: async () => {
        const supabase = await createClient()
        const { data, error } = await supabase.from('projects').select('id, name, status, priority, due_date').eq('workspace_id', workspaceId)
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = (data || []).map((p: any) => ({
          id: `project-${p.id}`,
          entityId: p.id,
          type: 'project',
          title: p.name,
          workspaceId,
          sourceKind: 'tool'
        }))

        return { success: true, data: data || [], sources }
      }
    }),

    get_documents: tool({
      description: 'Get a list of documents or wikis in the workspace, optionally filtering by title. Use this to find documentation, guidelines, or meeting notes.',
      parameters: z.object({ query: z.string().optional().describe('Search query for document title.') }),
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        let query = supabase.from('documents').select('id, title, content, folder_id, updated_at').eq('workspace_id', workspaceId)
        if (args.query) query = query.ilike('title', `%${args.query}%`)
        
        const { data, error } = await query.limit(20)
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = (data || []).map((doc: any) => ({
          id: `doc-${doc.id}`,
          entityId: doc.id,
          type: 'document',
          title: doc.title,
          workspaceId,
          sourceKind: 'tool'
        }))

        return { success: true, data: data || [], sources }
      }
    }),

    search_tasks: tool({
      description: 'Search for tasks in the workspace based on status, priority, or project.',
      parameters: searchTasksSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        let query = supabase.from('tasks').select('id, title, status, priority, due_date, project_id, assignee_id').eq('workspace_id', workspaceId)
        
        if (args.query) query = query.ilike('title', `%${args.query}%`)
        if (args.projectId) query = query.eq('project_id', args.projectId)
        if (args.assigneeId) query = query.eq('assignee_id', args.assigneeId)
        if (args.status) query = query.eq('status', args.status)
        if (args.priority) query = query.eq('priority', args.priority)
        if (args.isOverdue) query = query.lt('due_date', new Date().toISOString()).neq('status', 'Done')
        
        const { data, error } = await query.limit(Math.min(args.limit, 50))
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = await Promise.all((data || []).map(async (task: any) => ({
          id: `task-${task.id}`,
          entityId: task.id,
          type: 'task',
          title: task.title,
          workspaceId,
          sourceKind: 'tool',
          url: await resolveSourceUrl(workspaceId, 'task', task.id, task.project_id)
        })))

        return { success: true, data: data || [], sources }
      }
    }),

    get_task: tool({
      description: 'Get details of a specific task by ID.',
      parameters: taskIdSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        const { data, error } = await supabase.from('tasks').select('*').eq('id', args.taskId).eq('workspace_id', workspaceId).single()
        if (error || !data) return { success: false, errorCode: 'NOT_FOUND', message: 'Task not found.' }
        
        const sources: AISource[] = [{
          id: `task-${data.id}`,
          entityId: data.id,
          type: 'task',
          title: data.title,
          workspaceId,
          sourceKind: 'tool',
          url: await resolveSourceUrl(workspaceId, 'task', data.id, data.project_id)
        }]

        return { success: true, data, sources }
      }
    }),

    get_overdue_tasks: tool({
      description: 'Get all overdue tasks in the workspace or a specific project.',
      parameters: projectIdListSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        let query = supabase.from('tasks').select('id, title, status, due_date, project_id, assignee_id').eq('workspace_id', workspaceId).lt('due_date', new Date().toISOString()).neq('status', 'Done')
        if (args.projectId) query = query.eq('project_id', args.projectId)
        const { data, error } = await query.limit(Math.min(args.limit, 50))
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = await Promise.all((data || []).map(async (task: any) => ({
          id: `task-${task.id}`,
          entityId: task.id,
          type: 'task',
          title: task.title,
          workspaceId,
          sourceKind: 'tool',
          url: await resolveSourceUrl(workspaceId, 'task', task.id, task.project_id)
        })))

        return { success: true, data: data || [], sources }
      }
    }),

    get_blocked_tasks: tool({
      description: 'Get all blocked tasks in the workspace or a specific project.',
      parameters: projectIdListSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        let query = supabase.from('tasks').select('id, title, status, due_date, project_id, assignee_id').eq('workspace_id', workspaceId).eq('status', 'Blocked')
        if (args.projectId) query = query.eq('project_id', args.projectId)
        const { data, error } = await query.limit(Math.min(args.limit, 50))
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = await Promise.all((data || []).map(async (task: any) => ({
          id: `task-${task.id}`,
          entityId: task.id,
          type: 'task',
          title: task.title,
          workspaceId,
          sourceKind: 'tool',
          url: await resolveSourceUrl(workspaceId, 'task', task.id, task.project_id)
        })))

        return { success: true, data: data || [], sources }
      }
    }),

    get_project: tool({
      description: 'Get details of a specific project by ID.',
      parameters: projectIdSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        const { data, error } = await supabase.from('projects').select('*').eq('id', args.projectId).eq('workspace_id', workspaceId).single()
        if (error || !data) return { success: false, errorCode: 'NOT_FOUND', message: 'Project not found.' }
        
        const sources: AISource[] = [{
          id: `project-${data.id}`,
          entityId: data.id,
          type: 'project',
          title: data.name,
          workspaceId,
          sourceKind: 'tool',
          url: await resolveSourceUrl(workspaceId, 'project', data.id)
        }]

        return { success: true, data, sources }
      }
    }),

    get_project_health: tool({
      description: 'Get a deterministic health analysis of a specific project (status, risks, blockers).',
      parameters: projectIdSchema,
      // @ts-ignore
      execute: async (args) => {
        const { calculateProjectHealth } = await import('./health');
        const result = await calculateProjectHealth(args.projectId, workspaceId);
        return { success: true, data: result.health, sources: result.sources };
      }
    }),

    get_project_milestones: tool({
      description: 'Get milestones for a project.',
      parameters: projectIdSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        const { data, error } = await supabase.from('milestones').select('*').eq('project_id', args.projectId).eq('workspace_id', workspaceId)
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const projectSourceUrl = await resolveSourceUrl(workspaceId, 'project', args.projectId)
        const sources: AISource[] = (data || []).map((m: any) => ({
          id: `milestone-${m.id}`,
          entityId: m.id,
          type: 'milestone',
          title: m.name,
          workspaceId,
          sourceKind: 'tool',
          url: projectSourceUrl // using project URL for milestones as they are often displayed there
        }))

        return { success: true, data: data || [], sources }
      }
    }),

    get_team_workload: tool({
      description: 'Analyze workload distribution across team members in the workspace.',
      parameters: emptySchema,
      // @ts-ignore
      execute: async () => {
        const supabase = await createClient()
        const { data, error } = await supabase.from('tasks').select('id, status, assignee_id, estimated_hours').eq('workspace_id', workspaceId).neq('status', 'Done')
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const tasks = data || []
        const workloadMap: Record<string, { activeTasks: number, estimatedHours: number }> = {}
        
        tasks.forEach(task => {
          if (!task.assignee_id) return
          if (!workloadMap[task.assignee_id]) workloadMap[task.assignee_id] = { activeTasks: 0, estimatedHours: 0 }
          workloadMap[task.assignee_id].activeTasks += 1
          workloadMap[task.assignee_id].estimatedHours += task.estimated_hours || 0
        })

        const sources: AISource[] = [{
           id: `workload-analysis-${workspaceId}`,
           entityId: workspaceId,
           type: 'workspace',
           title: 'Team Workload Analysis',
           workspaceId,
           sourceKind: 'analysis'
        }]
        
        // Include user entities as sources
        for (const userId of Object.keys(workloadMap).slice(0, 10)) {
           const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
           if (userProfile) {
              sources.push({
                 id: `user-${userId}`,
                 entityId: userId,
                 type: 'user',
                 title: userProfile.full_name || 'Unknown User',
                 workspaceId,
                 sourceKind: 'tool'
              })
           }
        }

        return { success: true, data: workloadMap, sources }
      }
    }),

    get_time_entries: tool({
      description: 'Get recent time entries for the workspace, a project, or a user.',
      parameters: timeEntriesSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        let query = supabase.from('time_entries').select('id, user_id, project_id, task_id, duration_minutes, description, ended_at').eq('workspace_id', workspaceId).not('ended_at', 'is', null).order('ended_at', { ascending: false })
        if (args.projectId) query = query.eq('project_id', args.projectId)
        if (args.userId) query = query.eq('user_id', args.userId)
        
        const { data, error } = await query.limit(Math.min(args.limit, 50))
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = (data || []).map((t: any) => ({
          id: `time_entry-${t.id}`,
          entityId: t.id,
          type: 'time_entry',
          title: `Time Entry (${t.duration_minutes}m)`,
          workspaceId,
          sourceKind: 'tool'
        }))
        
        return { success: true, data: data || [], sources }
      }
    }),

    get_automation_status: tool({
      description: 'Check the status, rules, and recent execution history of automations in the workspace.',
      parameters: automationStatusSchema,
      // @ts-ignore
      execute: async (args) => {
        const supabase = await createClient()
        let query = supabase.from('automations').select('id, name, trigger_type, action_type, is_active').eq('workspace_id', workspaceId).order('created_at', { ascending: false })
        if (args.automationId) query = query.eq('id', args.automationId)
        
        const { data, error } = await query.limit(Math.min(args.limit, 50))
        if (error) return { success: false, errorCode: 'DB_ERROR', message: error.message }
        
        const sources: AISource[] = (data || []).map((a: any) => ({
          id: `automation-${a.id}`,
          entityId: a.id,
          type: 'automation',
          title: a.name,
          workspaceId,
          sourceKind: 'tool'
        }))

        return { success: true, data: data || [], sources }
      }
    }),

    // --- ACTION TOOLS (Proposal Pattern) ---
    
    generate_workflow_plan: tool({
      description: 'Propose a structured multi-step workflow plan. Do NOT execute mutations. Use this to represent dependency chains (e.g. create_project -> create_task -> assign_task). Maximum 5 steps. LLM cannot dictate risk.',
      parameters: z.object({
        title: z.string(),
        description: z.string(),
        steps: z.array(z.object({
          stepId: z.string(),
          tool: z.string(),
          args: z.record(z.any()),
          dependsOn: z.array(z.string()).optional(),
          expectedState: z.record(z.any()).optional(),
        }))
      }),
      // @ts-ignore
      execute: async (args) => {
        return { 
          status: 'workflow_proposal_ready',
          message: 'Workflow plan proposed to user for confirmation.',
          proposed_workflow: args 
        }
      }
    }),
    
    create_task: tool({
      description: 'Propose creating a new task. Wait for the user to confirm before execution.',
      parameters: createTaskSchema,
      // @ts-ignore
      execute: async (args) => {
        return { 
          status: 'proposal_ready',
          message: 'Action proposed to user for confirmation. Do not assume it has been executed yet.',
          proposed_action: args 
        }
      }
    }),
    
    update_task: tool({
      description: 'Propose updating an existing task (e.g. changing status, priority, or due date). Wait for user confirmation.',
      parameters: updateTaskSchema,
      // @ts-ignore
      execute: async (args) => {
        return { 
          status: 'proposal_ready',
          message: 'Action proposed to user for confirmation. Do not assume it has been executed yet.',
          proposed_action: args 
        }
      }
    }),
    
    assign_task: tool({
      description: 'Propose assigning a task to a user.',
      parameters: assignTaskSchema,
      // @ts-ignore
      execute: async (args) => {
        return { 
          status: 'proposal_ready',
          message: 'Action proposed to user for confirmation.',
          proposed_action: args 
        }
      }
    })
  }
}
