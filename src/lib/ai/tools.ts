import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export function getAiTools(workspaceId: string) {
  return {
    // --- READ ONLY TOOLS ---
    
    get_workspace_summary: tool({
      description: 'Get a summary of the workspace, including project count, task count, and active members.',
      parameters: z.object({}),
      execute: async () => {
        const supabase = await createClient()
        const [projects, tasks, members] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('status', 'Done'),
          supabase.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        ])
        return {
          totalProjects: projects.count,
          openTasks: tasks.count,
          totalMembers: members.count
        }
      }
    }),

    search_tasks: tool({
      description: 'Search for tasks in the workspace based on status, priority, or project.',
      parameters: z.object({
        projectId: z.string().optional().describe('Filter by Project ID.'),
        status: z.string().optional().describe('Filter by task status (e.g., Todo, In Progress, Blocked).'),
        isOverdue: z.boolean().optional().describe('Filter for overdue tasks.'),
        limit: z.number().default(10)
      }),
      execute: async (args: any) => {
        const supabase = await createClient()
        let query = supabase.from('tasks').select('id, title, status, priority, due_date, project_id').eq('workspace_id', workspaceId)
        
        if (args.projectId) query = query.eq('project_id', args.projectId)
        if (args.status) query = query.eq('status', args.status)
        if (args.isOverdue) query = query.lt('due_date', new Date().toISOString())
        
        const { data, error } = await query.limit(args.limit)
        if (error) throw new Error(error.message)
        return data || []
      }
    }),

    get_project_health: tool({
      description: 'Get the health status and aggregated metrics of a specific project.',
      parameters: z.object({
        projectId: z.string().describe('The ID of the project.')
      }),
      execute: async (args: any) => {
        const supabase = await createClient()
        // Ensure project is in workspace
        const { data: project } = await supabase.from('projects').select('id, name, status').eq('id', args.projectId).eq('workspace_id', workspaceId).single()
        if (!project) return { error: 'Project not found in this workspace' }

        const [tasks, budget] = await Promise.all([
          supabase.from('tasks').select('status, due_date').eq('project_id', args.projectId),
          supabase.from('project_budgets').select('*').eq('project_id', args.projectId).single()
        ])

        const allTasks = tasks.data || []
        const overdue = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done').length
        const blocked = allTasks.filter(t => t.status === 'Blocked').length

        return {
          project,
          metrics: {
            totalTasks: allTasks.length,
            completedTasks: allTasks.filter(t => t.status === 'Done').length,
            overdueTasks: overdue,
            blockedTasks: blocked,
          },
          budget: budget.data || null
        }
      }
    }),

    get_time_entries: tool({
      description: 'Get recent time entries for the workspace or a specific project.',
      parameters: z.object({
        projectId: z.string().optional().describe('Filter by Project ID.'),
        limit: z.number().default(15)
      }),
      execute: async (args: any) => {
        const supabase = await createClient()
        let query = supabase.from('time_entries').select('user_id, project_id, task_id, duration_minutes, description, ended_at').eq('workspace_id', workspaceId).not('ended_at', 'is', null).order('ended_at', { ascending: false })
        if (args.projectId) query = query.eq('project_id', args.projectId)
        
        const { data } = await query.limit(args.limit)
        return data || []
      }
    }),

    // --- ACTION TOOLS (Proposal Pattern) ---
    
    create_task: tool({
      description: 'Propose creating a new task. Wait for the user to confirm before execution.',
      parameters: z.object({
        title: z.string().describe('The title of the task to create.'),
        projectId: z.string().optional().describe('The ID of the project this task belongs to. Omit if unknown or unassigned.'),
        assigneeId: z.string().optional().describe('The user ID of the assignee. Omit if unknown or unassigned.'),
        dueDate: z.string().optional().describe('The due date in YYYY-MM-DD format.'),
        priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().describe('The priority of the task.'),
        description: z.string().optional().describe('A brief description of the task.')
      }),
      execute: async (args: any) => {
        return { 
          status: 'proposal_ready',
          message: 'Action proposed to user for confirmation. Do not assume it has been executed yet.',
          proposed_action: args 
        }
      }
    }),
    
    update_task: tool({
      description: 'Propose updating an existing task (e.g. changing status, priority, or due date). Wait for user confirmation.',
      parameters: z.object({
        taskId: z.string().describe('The ID of the task to update.'),
        updates: z.object({
          title: z.string().optional(),
          status: z.string().optional(),
          priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
          dueDate: z.string().optional(),
          assigneeId: z.string().optional(),
        }).describe('The fields to update.')
      }),
      execute: async (args: any) => {
        return { 
          status: 'proposal_ready',
          message: 'Action proposed to user for confirmation. Do not assume it has been executed yet.',
          proposed_action: args 
        }
      }
    }),
    
    assign_task: tool({
      description: 'Propose assigning a task to a user.',
      parameters: z.object({
        taskId: z.string().describe('The ID of the task.'),
        assigneeId: z.string().describe('The user ID of the assignee.')
      }),
      execute: async (args: any) => {
        return { 
          status: 'proposal_ready',
          message: 'Action proposed to user for confirmation.',
          proposed_action: args 
        }
      }
    })
  }
}

