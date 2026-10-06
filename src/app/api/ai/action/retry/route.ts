import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { retryWorkflowStep } from '@/lib/ai/workflow-executor'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { workspaceId, workflowId, stepId } = body

    if (!workspaceId || !workflowId || !stepId) {
      return NextResponse.json({ status: 'failed', error: 'Missing required parameters' }, { status: 400 })
    }

    let authContext;
    try {
      authContext = await verifyWorkspaceAccess(workspaceId)
    } catch (e: any) {
      return NextResponse.json({ status: 'denied', error: e.message }, { status: 403 })
    }
    
    const supabase = await createClient()

    const result = await retryWorkflowStep(supabase, workflowId, stepId, workspaceId, authContext.user.id);
    return NextResponse.json({ status: result.status, data: result })

  } catch (error: any) {
    console.error('Retry Step Error:', error)
    return NextResponse.json(
      { status: 'failed', error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
