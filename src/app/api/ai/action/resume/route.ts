import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { resumeWorkflowPlan } from '@/lib/ai/workflow-executor'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { workspaceId, workflowId } = body

    if (!workspaceId || !workflowId) {
      return NextResponse.json({ status: 'failed', error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. Authenticate user & Authorize workspace
    let authContext;
    try {
      authContext = await verifyWorkspaceAccess(workspaceId)
    } catch (e: any) {
      return NextResponse.json({ status: 'denied', error: e.message }, { status: 403 })
    }
    
    const supabase = await createClient()

    // 2. Delegate to executor for concurrency checks and execution
    const result = await resumeWorkflowPlan(supabase, workflowId, workspaceId, authContext.user.id);
    return NextResponse.json({ status: result.status, data: result })

  } catch (error: any) {
    console.error('Resume Workflow Error:', error)
    return NextResponse.json(
      { status: 'failed', error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
