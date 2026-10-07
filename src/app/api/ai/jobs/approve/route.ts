import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkWorkspaceAdmin } from '@/lib/ai/governance';

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Get the job
    const { data: job, error: jobError } = await supabase
      .from('ai_jobs')
      .select('id, workspace_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'WAITING_APPROVAL') {
      return NextResponse.json({ error: 'Job is not waiting for approval' }, { status: 400 });
    }

    // 2. Verify workspace admin RBAC
    const isAdmin = await checkWorkspaceAdmin(supabase, job.workspace_id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // 3. Transition to QUEUED
    const { error: updateError } = await supabase
      .from('ai_jobs')
      .update({
        status: 'QUEUED',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('status', 'WAITING_APPROVAL');

    if (updateError) throw updateError;

    // 4. Log Human Attribution (Audit)
    await supabase.from('ai_action_logs').insert({
      workspace_id: job.workspace_id,
      action: 'APPROVE_AI_JOB',
      details: { job_id: jobId },
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: 'Job approved and queued for execution' });

  } catch (error: any) {
    console.error('Approve Job API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
