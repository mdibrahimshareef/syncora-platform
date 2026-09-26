import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { createTaskSchema, updateTaskSchema, assignTaskSchema } from '@/lib/ai/tools'
import { createTask, updateTask } from '@/lib/api/tasks'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { workspaceId, toolName, args, actionId } = body

    if (!workspaceId || !toolName || !args || !actionId) {
      return NextResponse.json({ status: 'failed', error: 'Missing required parameters (workspaceId, toolName, args, actionId)' }, { status: 400 })
    }

    // 1. Authenticate user & Authorize workspace
    let authContext;
    try {
      authContext = await verifyWorkspaceAccess(workspaceId)
    } catch (e: any) {
      return NextResponse.json({ status: 'denied', error: e.message }, { status: 403 })
    }
    
    const supabase = await createClient()

    // 2. Idempotency Check
    const { data: existingAction } = await supabase.from('ai_action_logs').select('*').eq('action_id', actionId).single()
    if (existingAction) {
      if (existingAction.status === 'completed') {
        return NextResponse.json({ status: 'already_executed', data: existingAction.result })
      }
      if (existingAction.status === 'conflict') {
        return NextResponse.json({ status: 'conflict', data: existingAction.result })
      }
      return NextResponse.json({ status: 'failed', error: `Action is already ${existingAction.status}` }, { status: 400 })
    }

    // Insert pending action
    await supabase.from('ai_action_logs').insert({
      action_id: actionId,
      workspace_id: workspaceId,
      user_id: authContext.user.id,
      action_type: toolName,
      status: 'pending',
      payload: args
    })

    // Helper to complete action
    const completeAction = async (status: 'completed' | 'failed' | 'conflict' | 'denied', result?: any) => {
      await supabase.from('ai_action_logs').update({
        status,
        result,
        completed_at: new Date().toISOString()
      }).eq('action_id', actionId)
      return NextResponse.json({ status, data: result })
    }

    // 3. Route & Execute
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
          return completeAction('failed', { error: 'No active projects available in this workspace to attach the task to.' })
        }
        targetProjectId = proj.id
      } else {
        // Verify project belongs to workspace
        const { data: projCheck } = await supabase.from('projects').select('id').eq('id', targetProjectId).eq('workspace_id', workspaceId).single()
        if (!projCheck) return completeAction('denied', { error: 'Project not found in this workspace' })
      }

      if (parsedArgs.assigneeId) {
        // Verify assignee belongs to workspace
        const { data: assigneeCheck } = await supabase.from('workspace_members').select('user_id').eq('user_id', parsedArgs.assigneeId).eq('workspace_id', workspaceId).single()
        if (!assigneeCheck) return completeAction('denied', { error: 'Assignee is not a member of this workspace' })
      }

      let data;
      try {
        data = await createTask(supabase, targetProjectId, {
          title: parsedArgs.title,
          description: parsedArgs.description,
          status: 'Todo',
          priority: parsedArgs.priority || 'Medium',
          assigneeId: parsedArgs.assigneeId,
          dueDate: parsedArgs.dueDate,
          userId: authContext.user.id,
          workspaceId: workspaceId
        })
      } catch(e: any) {
        return completeAction('failed', { error: e.message })
      }

      // Audit log
      await supabase.from('activities').insert({
        actor_id: authContext.user.id,
        action: 'created',
        entity_id: data.id,
        entity_type: 'task',
        metadata: { source: 'ai_assisted' },
        workspace_id: workspaceId
      }).then(() => {}, () => {})

      return completeAction('completed', data)

    } else if (toolName === 'update_task') {
      const parsedArgs = updateTaskSchema.parse(args)

      const { data: taskCheck } = await supabase.from('tasks').select('id, status, assignee_id').eq('id', parsedArgs.taskId).eq('workspace_id', workspaceId).single()
      if (!taskCheck) return completeAction('denied', { error: 'Task not found in this workspace' })

      // Stale state detection
      if (parsedArgs.expectedState) {
        if (parsedArgs.expectedState.status && taskCheck.status !== parsedArgs.expectedState.status) {
          return completeAction('conflict', { reason: 'stale_state', currentState: taskCheck, message: `Task status is currently '${taskCheck.status}' instead of '${parsedArgs.expectedState.status}'` })
        }
        if (parsedArgs.expectedState.assigneeId !== undefined && taskCheck.assignee_id !== parsedArgs.expectedState.assigneeId) {
          return completeAction('conflict', { reason: 'stale_state', currentState: taskCheck, message: `Task assignee has changed.` })
        }
      }

      if (parsedArgs.updates.assigneeId) {
        const { data: assigneeCheck } = await supabase.from('workspace_members').select('user_id').eq('user_id', parsedArgs.updates.assigneeId).eq('workspace_id', workspaceId).single()
        if (!assigneeCheck) return completeAction('denied', { error: 'Assignee is not a member of this workspace' })
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
        return completeAction('failed', { error: e.message })
      }
      
      await supabase.from('activities').insert({
        actor_id: authContext.user.id,
        action: 'updated',
        entity_id: data.id,
        entity_type: 'task',
        metadata: { source: 'ai_assisted' },
        workspace_id: workspaceId
      }).then(() => {}, () => {})

      return completeAction('completed', data)

    } else if (toolName === 'assign_task') {
      const parsedArgs = assignTaskSchema.parse(args)

      const { data: taskCheck } = await supabase.from('tasks').select('id, assignee_id').eq('id', parsedArgs.taskId).eq('workspace_id', workspaceId).single()
      if (!taskCheck) return completeAction('denied', { error: 'Task not found in this workspace' })

      // Stale state detection
      if (parsedArgs.expectedState && parsedArgs.expectedState.assigneeId !== undefined) {
        if (taskCheck.assignee_id !== parsedArgs.expectedState.assigneeId) {
          return completeAction('conflict', { reason: 'stale_state', currentState: taskCheck, message: `Task assignee has changed.` })
        }
      }

      const { data: assigneeCheck } = await supabase.from('workspace_members').select('user_id').eq('user_id', parsedArgs.assigneeId).eq('workspace_id', workspaceId).single()
      if (!assigneeCheck) return completeAction('denied', { error: 'Assignee is not a member of this workspace' })

      let data;
      try {
        data = await updateTask(supabase, parsedArgs.taskId, {
          assigneeId: parsedArgs.assigneeId
        })
      } catch (e: any) {
        return completeAction('failed', { error: e.message })
      }
      
      await supabase.from('activities').insert({
        actor_id: authContext.user.id,
        action: 'assigned',
        entity_id: data.id,
        entity_type: 'task',
        metadata: { source: 'ai_assisted' },
        workspace_id: workspaceId
      }).then(() => {}, () => {})

      return completeAction('completed', data)

    } else {
      return completeAction('failed', { error: `Action ${toolName} is not supported` })
    }

  } catch (error: any) {
    console.error('Action Execution Error:', error)
    return NextResponse.json(
      { status: 'failed', error: error.message || 'An unexpected error occurred during execution' },
      { status: 500 }
    )
  }
}
