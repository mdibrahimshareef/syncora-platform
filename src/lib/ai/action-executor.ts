import { SupabaseClient } from '@supabase/supabase-js'
import { createTaskSchema, updateTaskSchema, assignTaskSchema } from '@/lib/ai/tools'
import { createTask, updateTask } from '@/lib/api/tasks'
import { validateAIRequest, recordAIUsage } from './governance'

export type ActionExecutionResult = 
  | { status: 'completed', data: any }
  | { status: 'failed', error: string }
  | { status: 'denied', error: string }
  | { status: 'conflict', reason: string, currentState: any, message: string }
  | { status: 'already_executed', data: any }
  | { status: 'executed_but_not_verified', data: any, error: string }

export async function executeAction(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  toolName: string,
  args: any
): Promise<ActionExecutionResult> {
  
  try {
    const policy = await validateAIRequest(supabase, workspaceId, userId, 'action');

    // Policy constraints based on tool
    if (toolName === 'create_task' && !policy.allow_ai_task_creation) {
      return { status: 'denied', error: 'AI task creation is disabled by workspace policy.' };
    }
    if (toolName === 'update_task' && !policy.allow_ai_task_updates) {
      return { status: 'denied', error: 'AI task updates are disabled by workspace policy.' };
    }
    if (toolName === 'assign_task' && !policy.allow_ai_task_assignment) {
      return { status: 'denied', error: 'AI task assignment is disabled by workspace policy.' };
    }
  } catch (governanceError: any) {
    if (governanceError.name === 'AIGovernanceError') {
      return { status: 'denied', error: governanceError.message };
    }
    throw governanceError;
  }
  
  if (toolName === 'create_task') {
    const parsedArgs = createTaskSchema.parse(args)
    
    let targetProjectId = parsedArgs.projectId
    if (!targetProjectId) {
      const { data: proj, error: projError } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      
      if (projError || !proj) {
        return { status: 'failed', error: 'No active projects available in this workspace to attach the task to.' }
      }
      targetProjectId = proj.id
    } else {
      // Verify project belongs to workspace
      const { data: projCheck } = await supabase.from('projects').select('id').eq('id', targetProjectId).eq('workspace_id', workspaceId).single()
      if (!projCheck) return { status: 'denied', error: 'Project not found in this workspace' }
    }

    if (parsedArgs.assigneeId) {
      // Verify assignee belongs to workspace
      const { data: assigneeCheck } = await supabase.from('workspace_members').select('user_id').eq('user_id', parsedArgs.assigneeId).eq('workspace_id', workspaceId).single()
      if (!assigneeCheck) return { status: 'denied', error: 'Assignee is not a member of this workspace' }
    }

    let data;
    try {
      data = await createTask(supabase, targetProjectId as string, {
        title: parsedArgs.title,
        description: parsedArgs.description,
        status: 'Todo',
        priority: parsedArgs.priority || 'Medium',
        assigneeId: parsedArgs.assigneeId,
        dueDate: parsedArgs.dueDate,
        userId: userId,
        workspaceId: workspaceId
      })
    } catch(e: any) {
      return { status: 'failed', error: e.message }
    }

    // Audit log
    await supabase.from('activities').insert({
      actor_id: userId,
      action: 'created',
      entity_id: data.id,
      entity_type: 'task',
      metadata: { source: 'ai_assisted' },
      workspace_id: workspaceId
    }).then(() => {}, () => {})
    
    // Verification
    const { data: verificationCheck } = await supabase.from('tasks').select('id').eq('id', data.id).single();
    if (!verificationCheck) {
      return { status: 'executed_but_not_verified', data, error: 'Database verification check failed after task creation.' }
    }

    await recordAIUsage(supabase, workspaceId, userId, { requestType: 'action' });
    return { status: 'completed', data }

  } else if (toolName === 'update_task') {
    const parsedArgs = updateTaskSchema.parse(args)

    const { data: taskCheck } = await supabase.from('tasks').select('id, status, assignee_id').eq('id', parsedArgs.taskId).eq('workspace_id', workspaceId).single()
    if (!taskCheck) return { status: 'denied', error: 'Task not found in this workspace' }

    // Stale state detection
    if (parsedArgs.expectedState) {
      if (parsedArgs.expectedState.status && taskCheck.status !== parsedArgs.expectedState.status) {
        return { status: 'conflict', reason: 'stale_state', currentState: taskCheck, message: `Task status is currently '${taskCheck.status}' instead of '${parsedArgs.expectedState.status}'` }
      }
      if (parsedArgs.expectedState.assigneeId !== undefined && taskCheck.assignee_id !== parsedArgs.expectedState.assigneeId) {
        return { status: 'conflict', reason: 'stale_state', currentState: taskCheck, message: `Task assignee has changed.` }
      }
    }

    if (parsedArgs.updates.assigneeId) {
      const { data: assigneeCheck } = await supabase.from('workspace_members').select('user_id').eq('user_id', parsedArgs.updates.assigneeId).eq('workspace_id', workspaceId).single()
      if (!assigneeCheck) return { status: 'denied', error: 'Assignee is not a member of this workspace' }
    }

    let data;
    try {
      data = await updateTask(supabase, parsedArgs.taskId, {
        title: parsedArgs.updates.title,
        status: parsedArgs.updates.status,
        priority: parsedArgs.updates.priority,
        dueDate: parsedArgs.updates.dueDate,
        assigneeId: parsedArgs.updates.assigneeId
      })
    } catch (e: any) {
      return { status: 'failed', error: e.message }
    }
    
    await supabase.from('activities').insert({
      actor_id: userId,
      action: 'updated',
      entity_id: data.id,
      entity_type: 'task',
      metadata: { source: 'ai_assisted' },
      workspace_id: workspaceId
    }).then(() => {}, () => {})
    
    // Verification
    const { data: verificationCheck } = await supabase.from('tasks').select('id, status, assignee_id, priority').eq('id', data.id).single();
    if (!verificationCheck) {
      return { status: 'executed_but_not_verified', data, error: 'Database verification check failed after task update.' }
    }
    if (parsedArgs.updates.status && verificationCheck.status !== parsedArgs.updates.status) {
      return { status: 'executed_but_not_verified', data, error: 'Task status did not match expected state after update.' }
    }

    await recordAIUsage(supabase, workspaceId, userId, { requestType: 'action' });
    return { status: 'completed', data }

  } else if (toolName === 'assign_task') {
    const parsedArgs = assignTaskSchema.parse(args)

    const { data: taskCheck } = await supabase.from('tasks').select('id, assignee_id').eq('id', parsedArgs.taskId).eq('workspace_id', workspaceId).single()
    if (!taskCheck) return { status: 'denied', error: 'Task not found in this workspace' }

    // Stale state detection
    if (parsedArgs.expectedState && parsedArgs.expectedState.assigneeId !== undefined) {
      if (taskCheck.assignee_id !== parsedArgs.expectedState.assigneeId) {
        return { status: 'conflict', reason: 'stale_state', currentState: taskCheck, message: `Task assignee has changed.` }
      }
    }

    const { data: assigneeCheck } = await supabase.from('workspace_members').select('user_id').eq('user_id', parsedArgs.assigneeId).eq('workspace_id', workspaceId).single()
    if (!assigneeCheck) return { status: 'denied', error: 'Assignee is not a member of this workspace' }

    let data;
    try {
      data = await updateTask(supabase, parsedArgs.taskId, {
        assigneeId: parsedArgs.assigneeId
      })
    } catch (e: any) {
      return { status: 'failed', error: e.message }
    }
    
    await supabase.from('activities').insert({
      actor_id: userId,
      action: 'assigned',
      entity_id: data.id,
      entity_type: 'task',
      metadata: { source: 'ai_assisted' },
      workspace_id: workspaceId
    }).then(() => {}, () => {})
    
    // Verification
    const { data: verificationCheck } = await supabase.from('tasks').select('id, assignee_id').eq('id', data.id).single();
    if (!verificationCheck || verificationCheck.assignee_id !== parsedArgs.assigneeId) {
       return { status: 'executed_but_not_verified', data, error: 'Task assignee did not match expected state after update.' }
    }

    await recordAIUsage(supabase, workspaceId, userId, { requestType: 'action' });
    return { status: 'completed', data }

  } else {
    return { status: 'failed', error: `Action ${toolName} is not supported` }
  }
}
