import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment, createWorkerClient, TestContext } from './test-env';
import { AIDispatcher } from '../../../src/lib/ai/dispatcher';

describe('R4.7 Live PostgreSQL Queue Concurrency & Lease Recovery (Section 4)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestEnvironment();
  }, 30000);

  afterAll(async () => {
    if (ctx) {
      await teardownTestEnvironment(ctx);
    }
  });

  // 4.1 Concurrent Claiming Invariant Test
  it('4.1 [Concurrent Claiming]: Multiple independent workers competing for jobs never claim the same job', async () => {
    const totalJobs = 20;
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsA.id;
    const userId = ctx.userA.id;

    // 1. Seed 20 QUEUED jobs in the live database
    const jobInserts = Array.from({ length: totalJobs }).map((_, i) => ({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'PROACTIVE',
      trigger_type: `test.concurrency.${i}`,
      status: 'QUEUED',
      priority: Math.floor(Math.random() * 10),
      scheduled_at: new Date(Date.now() - 1000).toISOString() // eligible now
    }));

    const { data: createdJobs, error: insertErr } = await (admin.from('ai_jobs') as any)
      .insert(jobInserts)
      .select('id');

    expect(insertErr).toBeNull();
    expect(createdJobs).toHaveLength(totalJobs);

    // 2. Spawn 5 independent worker dispatchers
    const workerCount = 5;
    const workers = Array.from({ length: workerCount }).map((_, i) => {
      const client = createWorkerClient();
      return new AIDispatcher(client, `live-worker-node-${i}`);
    });

    // 3. Race: All 5 workers attempt to claim up to 4 jobs concurrently
    const claimPromises = workers.map(worker => worker.claimJobs(4));
    const claimResults = await Promise.all(claimPromises);

    // 4. Aggregate claimed job IDs
    const allClaimedIds: string[] = [];
    const uniqueClaimedIds = new Set<string>();

    claimResults.forEach((claimedBatch, workerIdx) => {
      claimedBatch.forEach(job => {
        allClaimedIds.push(job.id);
        uniqueClaimedIds.add(job.id);

        // Verify claim invariant on each job
        expect(job.status).toBe('CLAIMED');
        expect(job.executor_id).toBe(`live-worker-node-${workerIdx}`);
        expect(job.claimed_at).toBeTruthy();
        expect(new Date(job.lease_expires_at!).getTime()).toBeGreaterThan(Date.now());
      });
    });

    console.log(`[Concurrency Test Evidence] Total jobs: ${totalJobs}, Total claims: ${allClaimedIds.length}, Unique claims: ${uniqueClaimedIds.size}`);

    // INVARIANT: No job claimed by more than one worker simultaneously!
    expect(allClaimedIds.length).toBe(uniqueClaimedIds.size);
    expect(allClaimedIds.length).toBeGreaterThan(0);
    expect(allClaimedIds.length).toBeLessThanOrEqual(totalJobs);
  }, 20000);

  // 4.1.2 Job Eligibility: Future scheduled jobs are NOT claimed
  it('4.1.2 [Job Eligibility]: Future-scheduled jobs and completed jobs are skipped by claim_ai_job', async () => {
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsA.id;
    const userId = ctx.userA.id;

    // Seed future job and already completed job
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // +1 hour
    const { data: futureJob } = await (admin.from('ai_jobs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'PROACTIVE',
      trigger_type: 'test.future',
      status: 'QUEUED',
      scheduled_at: futureDate
    }).select('id').single();

    const { data: doneJob } = await (admin.from('ai_jobs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'PROACTIVE',
      trigger_type: 'test.done',
      status: 'COMPLETED'
    }).select('id').single();

    const worker = new AIDispatcher(createWorkerClient(), 'eligibility-checker');
    const claimed = await worker.claimJobs(10);

    const claimedIds = claimed.map(j => j.id);
    expect(claimedIds).not.toContain(futureJob.id);
    expect(claimedIds).not.toContain(doneJob.id);
  });

  // 4.2 Lease Expiration and Recovery
  it('4.2 [Lease Recovery]: Expired leases are identified and reset to RECOVERY_PENDING', async () => {
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsA.id;
    const userId = ctx.userA.id;

    // Create a job claimed by an abandoned worker with an expired lease
    const expiredTime = new Date(Date.now() - 60000).toISOString(); // expired 1 minute ago
    const { data: stuckJob, error: stuckErr } = await (admin.from('ai_jobs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'PROACTIVE',
      trigger_type: 'test.stuck',
      status: 'RUNNING',
      executor_id: 'dead-worker-666',
      claimed_at: new Date(Date.now() - 360000).toISOString(),
      started_at: new Date(Date.now() - 300000).toISOString(),
      lease_expires_at: expiredTime
    }).select('id').single();

    expect(stuckErr).toBeNull();

    const recoveryWorker = new AIDispatcher(admin, 'recovery-sentinel');
    const recoveredCount = await recoveryWorker.recoverExpiredLeases();

    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    // Verify the stuck job transitioned to RECOVERY_PENDING
    const { data: reloadedJob } = await admin
      .from('ai_jobs')
      .select('status, lease_expires_at, next_attempt_at')
      .eq('id', stuckJob.id)
      .single();

    expect(reloadedJob?.status).toBe('RECOVERY_PENDING');
    expect(reloadedJob?.lease_expires_at).toBeNull();
    expect(reloadedJob?.next_attempt_at).toBeTruthy();
  });

  // 4.3 Idempotent Retries & Attempt Caps
  it('4.3 [Attempt Caps]: Failing jobs increment attempt count and mark FAILED upon reaching max_attempts', async () => {
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsA.id;
    const userId = ctx.userA.id;

    // Job with attempt_count = 2 and max_attempts = 3
    const { data: jobToFail } = await (admin.from('ai_jobs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'PROACTIVE',
      trigger_type: 'test.retry_cap',
      status: 'CLAIMED',
      executor_id: 'retry-tester',
      attempt_count: 2,
      max_attempts: 3
    }).select('*').single();

    const dispatcher = new AIDispatcher(admin, 'retry-tester');
    
    // Simulate failing the job
    await (dispatcher as any).markJobFailed(jobToFail.id, 'Simulated fatal crash');

    const { data: finalJob } = await admin
      .from('ai_jobs')
      .select('status, attempt_count, failed_at, lease_expires_at')
      .eq('id', jobToFail.id)
      .single();

    expect(finalJob?.status).toBe('FAILED');
    expect(finalJob?.attempt_count).toBe(3);
    expect(finalJob?.failed_at).toBeTruthy();
    expect(finalJob?.lease_expires_at).toBeNull();
  });

  // 4.4 Race Conditions: Approve vs Reject
  it('4.4 [Approval vs Reject Race]: Concurrent approve and reject resolves safely with exactly one winner', async () => {
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsA.id;
    const userId = ctx.userA.id;

    // Create a job in WAITING_APPROVAL
    const { data: approvalJob } = await (admin.from('ai_jobs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'EVENT_TRIGGERED',
      trigger_type: 'test.approval_race',
      status: 'WAITING_APPROVAL'
    }).select('id').single();

    // Two competing operations racing to update status from WAITING_APPROVAL
    const approveOp = admin
      .from('ai_jobs')
      .update({ status: 'QUEUED', updated_at: new Date().toISOString() })
      .eq('id', approvalJob.id)
      .eq('status', 'WAITING_APPROVAL')
      .select('id, status');

    const rejectOp = admin
      .from('ai_jobs')
      .update({ status: 'CANCELLED', failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', approvalJob.id)
      .eq('status', 'WAITING_APPROVAL')
      .select('id, status');

    const [resApprove, resReject] = await Promise.all([approveOp, rejectOp]);

    const approvedCount = resApprove.data?.length || 0;
    const rejectedCount = resReject.data?.length || 0;

    // Exactly one operation must succeed!
    expect(approvedCount + rejectedCount).toBe(1);

    const { data: finalState } = await admin
      .from('ai_jobs')
      .select('status')
      .eq('id', approvalJob.id)
      .single();

    expect(['QUEUED', 'CANCELLED']).toContain(finalState?.status);
  });
});
