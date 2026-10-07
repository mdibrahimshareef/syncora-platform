import { SupabaseClient } from '@supabase/supabase-js';
import { AIJob } from '../../types/ai-jobs';
import { validateAIRequest } from './governance';
import { runProactiveAnalysis } from './proactive-intelligence';

export class AILoggingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AILoggingError';
  }
}

/**
 * AI Job Dispatcher (R4.5)
 * Claims and executes jobs safely using the robust infrastructure from R4.4.
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

    return jobs as AIJob[];
  }

  /**
   * Processes a single claimed job.
   */
  async processJob(job: AIJob): Promise<void> {
    try {
      // 1. Mark as running
      await this.supabase
        .from('ai_jobs')
        .update({ status: 'RUNNING', started_at: new Date().toISOString() })
        .eq('id', job.id);

      // 2. Re-validate governance!
      // This is the critical safety boundary for background execution
      try {
        const requestType = job.job_type === 'PROACTIVE' ? 'action' : 'workflow_execute';
        await validateAIRequest(this.supabase, job.workspace_id, job.user_id, requestType);
      } catch (govError: any) {
        // If governance fails (e.g. rate limit, disabled policy), mark as FAILED
        await this.markJobFailed(job.id, `Governance check failed: ${govError.message}`);
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
      await this.markJobCompleted(job.id);
    } catch (error: any) {
      await this.markJobFailed(job.id, error.message);
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
   * Mock execution of a workflow job (to be expanded).
   */
  private async executeWorkflowJob(job: AIJob): Promise<void> {
    // This would initialize or continue a workflow from R4.1
    console.log(`Executing workflow job ${job.id}`);
  }

  /**
   * Transitions a job to COMPLETED.
   */
  private async markJobCompleted(jobId: string): Promise<void> {
    await this.supabase
      .from('ai_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        lease_expires_at: null
      })
      .eq('id', jobId);
  }

  /**
   * Transitions a job to FAILED and handles retries.
   */
  private async markJobFailed(jobId: string, errorMsg: string): Promise<void> {
    console.error(`Job ${jobId} failed: ${errorMsg}`);
    
    // Fetch current attempt count
    const { data: job } = await this.supabase
      .from('ai_jobs')
      .select('attempt_count, max_attempts')
      .eq('id', jobId)
      .single();
      
    if (!job) return;

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
    } else {
      await this.supabase
        .from('ai_jobs')
        .update({
          status: 'RECOVERY_PENDING',
          attempt_count,
          lease_expires_at: null,
          next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Retry in 5 minutes
        })
        .eq('id', jobId);
    }
  }

  /**
   * The recovery scanner: finds expired leases and resets them.
   */
  async recoverExpiredLeases(): Promise<number> {
    const { data, error } = await this.supabase
      .from('ai_jobs')
      .update({
        status: 'RECOVERY_PENDING',
        lease_expires_at: null,
        next_attempt_at: new Date().toISOString(), // Immediate retry
      })
      .in('status', ['CLAIMED', 'RUNNING'])
      .lt('lease_expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Failed to recover leases:', error);
      return 0;
    }
    
    return data?.length || 0;
  }
}
