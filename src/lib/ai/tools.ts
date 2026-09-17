import { tool } from 'ai'
import { z } from 'zod'

export const aiTools = {
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
    execute: async (args) => {
      // The actual execution is halted here on the server side because 
      // Vercel AI SDK will return the toolCall to the client. 
      // The client intercepts it, renders the confirmation UI, and then executes the mutation separately!
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
    parameters: z.object({
      taskId: z.string().describe('The ID of the task.'),
      assigneeId: z.string().describe('The user ID of the assignee.')
    }),
    execute: async (args) => {
      return { 
        status: 'proposal_ready',
        message: 'Action proposed to user for confirmation.',
        proposed_action: args 
      }
    }
  })
}

