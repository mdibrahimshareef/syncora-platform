import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { AIDispatcher } from '@/lib/ai/dispatcher';

export const maxDuration = 300; // Allow Vercel function to run up to 5 minutes

/**
 * Phase 4: Durable Scheduled Cron
 * 
 * Called periodically (e.g. via Vercel Cron every hour).
 * Uses the Service Role key to bypass RLS, acting as the system orchestrator.
 */
export async function GET(req: Request) {
  try {
    // 1. Verify authorization (e.g. CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const dispatcher = new AIDispatcher(supabaseAdmin, 'cron-dispatcher');

    // 2. Run Crash Recovery (Phase 3)
    const recoveredLeases = await dispatcher.recoverExpiredLeases();
    console.log(`[AI Cron] Recovered ${recoveredLeases} expired leases`);

    // 3. Inject Proactive Jobs (Phase 6 triggers)
    // We get all active workspaces and queue a PROACTIVE job if one isn't already queued.
    const { data: workspaces, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('id, owner_id')
      .limit(100); // Batch in chunks if massive

    if (wsError) throw wsError;

    for (const ws of ((workspaces as any[]) || [])) {
      // Check if a PROACTIVE job is already queued for this workspace
      const { data: existing } = await supabaseAdmin
        .from('ai_jobs')
        .select('id')
        .eq('workspace_id', ws.id)
        .eq('job_type', 'PROACTIVE')
        .in('status', ['QUEUED', 'RUNNING', 'CLAIMED', 'RECOVERY_PENDING'])
        .single();

      if (!existing) {
        // Queue the proactive analysis job
        // @ts-ignore - ai_jobs is not yet in generated Database types
        await supabaseAdmin.from('ai_jobs').insert({
          workspace_id: ws.id,
          user_id: ws.owner_id, // Attributed to the workspace owner
          job_type: 'PROACTIVE',
          trigger_type: 'cron.hourly',
          priority: 0,
        } as any);
      }
    }

    // 4. Drain the AI Jobs queue
    let processedCount = 0;
    let hasMoreJobs = true;

    // Process up to 50 jobs per cron invocation to avoid timeouts
    while (hasMoreJobs && processedCount < 50) {
      const claimedJobs = await dispatcher.claimJobs(5);
      
      if (claimedJobs.length === 0) {
        hasMoreJobs = false;
        break;
      }

      // Process batch sequentially or concurrently (sequentially to avoid spiking connection limits)
      for (const job of claimedJobs) {
        await dispatcher.processJob(job);
        processedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      recovered_leases: recoveredLeases,
      processed_jobs: processedCount
    });
  } catch (error: any) {
    console.error('[AI Cron] Failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
