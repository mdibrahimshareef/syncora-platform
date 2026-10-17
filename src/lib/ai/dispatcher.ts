import { SupabaseClient } from '@supabase/supabase-js';
import { AIJob } from '../../types/ai-jobs';
import { validateAIRequest } from './governance';
import { runProactiveAnalysis } from './proactive-intelligence';
import { logStructuredAIEvent, createTraceContext } from './telemetry';

export class AILoggingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AILoggingError';
  }
}

/**
 * AI Job Dispatcher (R4.5 / R4.8)
 * Claims and executes jobs safely using the robust infrastructure with structured observability.
 */
export class AIDispatcher {
  private supabase: SupabaseClient;
  private executorId: string;

  constructor(supabase: SupabaseClient, executorId: string = 'worker-node-1') {
    this.supabase = supabase;
    this.executorId = executorId;
  }

  /**
   * Claims up to `limit` jobs from the database using an atomic SKIP LOCKED query.
   */
  async claimJobs(limit: number = 5): Promise<AIJob[]> {
    const { data: jobs, error } = await this.supabase.rpc('claim_ai_job', {
      p_executor_id: this.executorId,
      p_limit: limit
    });

    if (error) {
      console.error('Failed to claim AI jobs:', error);
      return [];
    }

    const claimed = (jobs || []) as AIJob[];
    for (const job of claimed) {
      logStructuredAIEvent({
        eventName: 'JOB_CLAIMED',
        traceContext: createTraceContext({
          workspaceId: job.workspace_id,
          userId: job.user_id,
          jobId: job.id,
          workflowId: job.workflow_id || undefined
        }),
        metadata: {
          executorId: this.executorId,
          jobType: job.job_type,
          triggerType: job.trigger_type,
          priority: job.priority
        }
      });
    }

    return claimed;
  }

  /**
   * Processes a single claimed job.
   */
  async processJob(job: AIJob): Promise<void> {
    const startTime = Date.now();
    const traceCtx = createTraceContext({
      workspaceId: job.workspace_id,
      userId: job.user_id,
      jobId: job.id,
      workflowId: job.workflow_id || undefined
    });

    try {
      // 1. Mark as running
      await this.supabase
        .from('ai_jobs')
        .update({ status: 'RUNNING', started_at: new Date().toISOString() })
        .eq('id', job.id);

      logStructuredAIEvent({
        eventName: 'WORKFLOW_STARTED',
        traceContext: traceCtx,
        metadata: { jobType: job.job_type, startedAt: new Date().toISOString() }
      });

      // 2. Re-validate governance!
      // This is the critical safety boundary for background execution
      try {
        const requestType = job.job_type === 'PROACTIVE' ? 'action' : 'workflow_execute';
        await validateAIRequest(this.supabase, job.workspace_id, job.user_id, requestType);
      } catch (govError: any) {
        logStructuredAIEvent({
          eventName: 'QUOTA_EXCEEDED',
          traceContext: traceCtx,
          errorCategory: govError.code || 'GOVERNANCE_ERROR',
          metadata: { reason: govError.message }
        });
        // If governance fails (e.g. rate limit, disabled policy), mark as FAILED
        await this.markJobFailed(job.id, `Governance check failed: ${govError.message}`, traceCtx);
        return;
      }

      // 3. Execution based on job_type
      if (job.job_type === 'PROACTIVE') {
        await this.executeProactiveJob(job);
      } else if (job.job_type === 'EVENT_TRIGGERED' || job.job_type === 'SCHEDULED') {
        await this.executeWorkflowJob(job);
      } else {
        throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // 4. Mark as completed
      await this.markJobCompleted(job.id, traceCtx, Date.now() - startTime);
    } catch (error: any) {
      await this.markJobFailed(job.id, error.message, traceCtx);
    }
  }

  /**
   * Mock execution of a proactive job (to be expanded).
   */
  private async executeProactiveJob(job: AIJob): Promise<void> {
    console.log(`Executing proactive job ${job.id}`);
    await runProactiveAnalysis(this.supabase, job);
  }

  /**
   * Execution of a workflow job using the established R4.1-R4.3 workflow executor.
   */
  private async executeWorkflowJob(job: AIJob): Promise<void> {
    console.log(`Executing workflow job ${job.id}`);
    
    let plan = job.payload?.plan;
    if (!plan && job.workflow_id) {
      const { data: workflow } = await this.supabase
        .from('ai_workflows')
        .select('plan')
        .eq('id', job.workflow_id)
        .eq('workspace_id', job.workspace_id)
        .single();
      plan = workflow?.plan;
    }

    if (plan) {
      const { executeWorkflowPlan } = await import('./workflow-executor');
      const result = await executeWorkflowPlan(this.supabase, job.workspace_id, job.user_id, plan);
      if (result.status === 'FAILED') {
        throw new Error(result.error || `Workflow execution failed at step ${result.failedStep}`);
      }
    }
  }

  /**
   * Transitions a job to COMPLETED.
   */
  private async markJobCompleted(jobId: string, traceCtx?: any, durationMs?: number): Promise<void> {
    await this.supabase
      .from('ai_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        lease_expires_at: null
      })
      .eq('id', jobId);

    if (traceCtx) {
      logStructuredAIEvent({
        eventName: 'WORKFLOW_COMPLETED',
        traceContext: traceCtx,
        durationMs,
        metadata: { jobId, status: 'COMPLETED' }
      });
    }
  }

  /**
   * Transitions a job to FAILED and handles retries.
   */
  private async markJobFailed(jobId: string, errorMsg: string, traceCtx?: any): Promise<void> {
    console.error(`Job ${jobId} failed: ${errorMsg}`);
    
    // Fetch current attempt count
    const { data: job } = await this.supabase
      .from('ai_jobs')
      .select('attempt_count, max_attempts, workspace_id, user_id, workflow_id')
      .eq('id', jobId)
      .single();
      
    if (!job) return;

    const currentTraceCtx = traceCtx || createTraceContext({
      workspaceId: job.workspace_id,
      userId: job.user_id,
      jobId,
      workflowId: job.workflow_id || undefined
    });

    const attempt_count = (job.attempt_count || 0) + 1;
    
    if (attempt_count >= job.max_attempts) {
      await this.supabase
        .from('ai_jobs')
        .update({
          status: 'FAILED',
          failed_at: new Date().toISOString(),
          attempt_count,
          lease_expires_at: null
        })
        .eq('id', jobId);

      logStructuredAIEvent({
        eventName: 'REQUEST_FAILED',
        traceContext: currentTraceCtx,
        errorCategory: 'WORKFLOW_STEP_FAILED',
        metadata: { jobId, error: errorMsg, attemptCount: attempt_count, maxAttempts: job.max_attempts }
      });
    } else {
      const nextAttempt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await this.supabase
        .from('ai_jobs')
        .update({
          status: 'RECOVERY_PENDING',
          attempt_count,
          lease_expires_at: null,
          next_attempt_at: nextAttempt // Retry in 5 minutes
        })
        .eq('id', jobId);

      logStructuredAIEvent({
        eventName: 'RETRY_SCHEDULED',
        traceContext: currentTraceCtx,
        metadata: { jobId, attemptCount: attempt_count, nextAttemptAt: nextAttempt, reason: errorMsg }
      });
    }
  }

  /**
   * The recovery scanner: finds expired leases and resets them.
   */
  async recoverExpiredLeases(): Promise<number> {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('ai_jobs')
      .update({
        status: 'RECOVERY_PENDING',
        lease_expires_at: null,
        next_attempt_at: nowIso, // Immediate retry
      })
      .in('status', ['CLAIMED', 'RUNNING'])
      .lt('lease_expires_at', nowIso)
      .select('id, workspace_id, user_id, workflow_id');

    if (error) {
      console.error('Failed to recover leases:', error);
      return 0;
    }
    
    const recovered = data || [];
    for (const job of recovered) {
      logStructuredAIEvent({
        eventName: 'RECOVERY_ATTEMPTED',
        traceContext: createTraceContext({
          workspaceId: job.workspace_id,
          userId: job.user_id,
          jobId: job.id,
          workflowId: job.workflow_id || undefined
        }),
        metadata: { reason: 'Lease expired while in CLAIMED/RUNNING status', recoveredAt: nowIso }
      });
    }

    return recovered.length;
  }
}
