import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { executeAction } from '@/lib/ai/action-executor'
import { executeWorkflowPlan } from '@/lib/ai/workflow-executor'

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

    // 2. Idempotency Check for Workflows / Actions
    const { data: existingAction } = await supabase.from('ai_action_logs').select('*').eq('action_id', actionId).single()
    if (existingAction) {
      if (existingAction.status === 'completed' || existingAction.status === 'COMPLETED') {
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
    const completeAction = async (status: 'completed' | 'failed' | 'conflict' | 'denied' | 'PARTIALLY_COMPLETED' | 'VERIFICATION_FAILED' | 'COMPLETED', result?: any) => {
      await supabase.from('ai_action_logs').update({
        status,
        result,
        completed_at: new Date().toISOString()
      }).eq('action_id', actionId)
      return NextResponse.json({ status, data: result })
    }

    // 3. Route & Execute
    if (toolName === 'generate_workflow_plan') {
      const result = await executeWorkflowPlan(supabase, workspaceId, authContext.user.id, args);
      return completeAction(result.status as any, result);
    }
    
    const result = await executeAction(supabase, workspaceId, authContext.user.id, toolName, args);
    return completeAction(result.status === 'executed_but_not_verified' ? 'completed' : result.status as any, result.status === 'executed_but_not_verified' ? { ...result.data, __verificationWarning: result.error } : (result as any).data || result)

  } catch (error: any) {
    console.error('Action Execution Error:', error)
    return NextResponse.json(
      { status: 'failed', error: error.message || 'An unexpected error occurred during execution' },
      { status: 500 }
    )
  }
}
