import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verify Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, event, payload } = body

    if (!workspaceId || !event || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 2. Fetch active automations for this workspace
    // RLS will automatically ensure the user has access to this workspace
    const { data: automationsData, error: fetchError } = await (supabase as any)
      .from('automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      
    const automations = automationsData as any[];

    if (fetchError) {
      console.error("Error fetching automations:", fetchError)
      return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 })
    }

    if (!automations || automations.length === 0) {
      return NextResponse.json({ success: true, message: 'No active automations to evaluate' })
    }

    const results = []

    // 3. Evaluate each automation
    for (const automation of automations) {
      try {
        let shouldExecute = false

        // Trigger Evaluation Logic
        switch (automation.trigger_type) {
          case 'on_task_create':
            if (event === 'on_task_create') shouldExecute = true;
            break;
            
          case 'on_status_change':
            if (event === 'on_status_change' && payload.newStatus) {
              const config = typeof automation.trigger_config === 'string' 
                ? JSON.parse(automation.trigger_config) 
                : (automation.trigger_config || {});
              
              if (!config.targetStatus || config.targetStatus === payload.newStatus) {
                shouldExecute = true;
              }
            }
            break;
            
          case 'on_due_date':
            if (event === 'on_due_date') {
              shouldExecute = true;
            }
            break;
        }

        if (shouldExecute) {
          let executionSuccess = false
          let executionError = null

          // 4. Action Execution Logic
          switch (automation.action_type) {
            case 'assign_user': {
              const config = typeof automation.action_config === 'string'
                ? JSON.parse(automation.action_config)
                : (automation.action_config || {});
              
              if (config.userId && payload.taskId) {
                const { error: updateError } = await (supabase as any)
                  .from('tasks')
                  .update({ assignee_id: config.userId })
                  .eq('id', payload.taskId)
                  .eq('workspace_id', workspaceId)

                if (updateError) throw updateError
                executionSuccess = true
              }
              break;
            }

            case 'notify_user': {
              const config = typeof automation.action_config === 'string'
                ? JSON.parse(automation.action_config)
                : (automation.action_config || {});
                
              if (config.userId) {
                const { error: notifError } = await (supabase as any)
                  .from('notifications')
                  .insert({
                    user_id: config.userId,
                    workspace_id: workspaceId,
                    type: 'SYSTEM',
                    title: 'Automation Triggered',
                    message: config.message || `An automation has notified you about task ${payload.taskId}.`,
                    link: `/projects/${payload.projectId || ''}`,
                    is_read: false
                  })
                  
                if (notifError) throw notifError
                executionSuccess = true
              }
              break;
            }
            
            case 'create_subtask': {
              const config = typeof automation.action_config === 'string'
                ? JSON.parse(automation.action_config)
                : (automation.action_config || {});
                
              if (config.title && payload.taskId) {
                const { error: subtaskError } = await (supabase as any)
                  .from('tasks')
                  .insert({
                    project_id: payload.projectId,
                    workspace_id: workspaceId,
                    parent_id: payload.taskId,
                    title: config.title,
                    description: config.description || null,
                    status: 'To Do',
                    priority: 'Medium',
                    created_by: user.id
                  })
                  
                if (subtaskError) throw subtaskError
                executionSuccess = true
              }
              break;
            }
            
            case 'trigger_webhook': {
              const config = typeof automation.action_config === 'string'
                ? JSON.parse(automation.action_config)
                : (automation.action_config || {});
                
              if (config.url) {
                try {
                  const res = await fetch(config.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      workspaceId,
                      event,
                      payload,
                      automationId: automation.id
                    })
                  })
                  if (!res.ok) throw new Error(`Webhook returned ${res.status}`)
                  executionSuccess = true
                } catch (webhookErr) {
                  throw new Error(`Webhook failed: ${webhookErr}`)
                }
              }
              break;
            }
              
            default:
              throw new Error(`Unsupported action type: ${automation.action_type}`)
          }

          // 5. Record Run
          await (supabase as any).from('automation_runs').insert({
            automation_id: automation.id,
            workspace_id: workspaceId,
            status: executionSuccess ? 'Success' : 'Failed',
            error_message: executionError ? String(executionError) : null
          })

          results.push({ automationId: automation.id, executed: true, success: executionSuccess })
        }
      } catch (err) {
        console.error(`Error executing automation ${automation.id}:`, err)
        // Record Failure
        await (supabase as any).from('automation_runs').insert({
          automation_id: automation.id,
          workspace_id: workspaceId,
          status: 'Failed',
          error_message: String(err)
        })
        results.push({ automationId: automation.id, executed: true, success: false, error: String(err) })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Automation evaluation error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
