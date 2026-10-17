import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { AIDispatcher } from '@/lib/ai/dispatcher';

export const maxDuration = 300; // Allow function to run up to 5 minutes

/**
 * Validates the cron request authorization using constant-time comparison.
 * Fails closed in production if CRON_SECRET is not configured.
 */
function verifyCronAuth(req: Request): { authorized: boolean; reason?: string } {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!cronSecret) {
    if (isProduction) {
      console.error('[AI Cron] CRON_SECRET is not configured in production environment.');
      return { authorized: false, reason: 'Cron authentication is not configured' };
    }
    // In local non-production environment, allow if specifically opted in via test header or local env
    const devBypass = req.headers.get('x-syncora-dev-cron');
    if (devBypass === 'true') {
      return { authorized: true };
    }
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, reason: 'Missing or malformed Authorization header' };
  }

  const token = authHeader.slice(7).trim();
  if (!cronSecret || token.length !== cronSecret.length) {
    return { authorized: false, reason: 'Invalid cron authorization token' };
  }

  const tokenBuf = Buffer.from(token, 'utf-8');
  const secretBuf = Buffer.from(cronSecret, 'utf-8');

  if (crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return { authorized: true };
  }

  return { authorized: false, reason: 'Invalid cron authorization token' };
}

/**
 * Core cron handler:
 * 1. Authenticates request securely.
 * 2. Recovers expired leases.
 * 3. Enqueues deduplicated proactive work intelligence jobs.
 * 4. Drains the job queue in bounded batches with individual job fault-tolerance.
 */
async function handleCronExecution(req: Request) {
  const startTime = Date.now();

  // 1. Verify authorization securely
  const auth = verifyCronAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Unauthorized', message: auth.reason },
      { status: 401 }
    );
  }

  try {
    const supabaseAdmin = createAdminClient();
    const dispatcher = new AIDispatcher(supabaseAdmin, 'cron-dispatcher');

    // 2. Lease Recovery Sweep
    const recoveredLeases = await dispatcher.recoverExpiredLeases();
    console.log(`[AI Cron] Lease recovery completed. Recovered ${recoveredLeases} expired leases.`);

    // 3. Inject Proactive Jobs for Active Workspaces (Deduplicated)
    const { data: workspaces, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .select('id, created_by')
      .limit(100);

    if (wsError) {
      console.error('[AI Cron] Failed to query active workspaces:', wsError);
      throw wsError;
    }

    let enqueuedProactiveJobs = 0;
    for (const ws of ((workspaces as unknown as Array<{ id: string; created_by: string }>) || [])) {
      if (!ws.created_by) continue;

      // Deduplication check: only enqueue if no active job is currently queued or in-flight
      const { data: existing } = await supabaseAdmin
        .from('ai_jobs')
        .select('id')
        .eq('workspace_id', ws.id)
        .eq('job_type', 'PROACTIVE')
        .in('status', ['QUEUED', 'RUNNING', 'CLAIMED', 'RECOVERY_PENDING'])
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await (supabaseAdmin.from('ai_jobs') as any).insert({
          workspace_id: ws.id,
          user_id: ws.created_by,
          job_type: 'PROACTIVE',
          trigger_type: 'cron.hourly',
          priority: 0,
          status: 'QUEUED'
        });

        if (!insertError) {
          enqueuedProactiveJobs++;
        } else {
          console.error(`[AI Cron] Failed to enqueue proactive job for workspace ${ws.id}:`, insertError);
        }
      }
    }

    // 4. Drain the AI Jobs queue in bounded batches
    let processedCount = 0;
    let failedCount = 0;
    let hasMoreJobs = true;
    const maxJobsPerInvocation = 50;

    while (hasMoreJobs && processedCount + failedCount < maxJobsPerInvocation) {
      const remainingLimit = Math.min(5, maxJobsPerInvocation - (processedCount + failedCount));
      const claimedJobs = await dispatcher.claimJobs(remainingLimit);

      if (claimedJobs.length === 0) {
        hasMoreJobs = false;
        break;
      }

      for (const job of claimedJobs) {
        try {
          await dispatcher.processJob(job);
          processedCount++;
        } catch (jobErr: unknown) {
          failedCount++;
          const msg = jobErr instanceof Error ? jobErr.message : 'Unknown execution error';
          console.error(`[AI Cron] Error processing job ${job.id}:`, msg);
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      recovered_leases: recoveredLeases,
      enqueued_proactive_jobs: enqueuedProactiveJobs,
      processed_jobs: processedCount,
      failed_jobs: failedCount,
      duration_ms: durationMs
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal cron dispatcher error';
    console.error('[AI Cron] Fatal execution failure:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: msg, duration_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleCronExecution(req);
}

export async function POST(req: Request) {
  return handleCronExecution(req);
}
