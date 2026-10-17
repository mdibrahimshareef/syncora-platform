import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment, TestContext } from './test-env';
import { getLanguageModel } from '../../../src/lib/ai/provider';
import { AIDispatcher } from '../../../src/lib/ai/dispatcher';

describe('R4.7 Real Background AI Execution & Provider Pathways (Section 6)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestEnvironment();
  }, 30000);

  afterAll(async () => {
    if (ctx) {
      await teardownTestEnvironment(ctx);
    }
  });

  // 6.1 Provider Selection & Live Execution
  it('6.1 [Provider Selection]: Authoritative provider resolution selects correct model or mock', () => {
    const currentProvider = process.env.AI_PROVIDER || 'mock';
    const model = getLanguageModel();

    if (currentProvider === 'google') {
      expect(model).toBeDefined();
      expect((model as any).modelId).toContain('gemini');
    } else if (currentProvider === 'mock') {
      expect(model).toBeUndefined(); // Indicates mock mode in architecture
    }
  });

  // 6.2 Background Proactive Job Pathway Grounded in Real DB Records
  it('6.2 [Proactive Job Execution]: Generates grounded ai_insights for real overdue tasks in DB', async () => {
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsA.id;
    const userId = ctx.userA.id;

    // 1. Seed a project and an overdue task in Workspace A
    const { data: project } = await admin
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name: 'Infrastructure Security Project',
        slug: `infra-sec-${Date.now()}`,
        status: 'Active',
        created_by: userId
      })
      .select('id')
      .single();

    const overdueDate = new Date(Date.now() - 86400000).toISOString(); // 1 day overdue
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        project_id: project!.id,
        title: 'Emergency Critical Security Patch',
        priority: 'High',
        due_date: overdueDate,
        status: 'In Progress',
        created_by: userId
      })
      .select('id, title')
      .single();

    expect(taskErr).toBeNull();
    expect(task?.id).toBeTruthy();

    // 2. Queue a proactive analysis job
    const { data: job, error: jobErr } = await (admin.from('ai_jobs') as any)
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        job_type: 'PROACTIVE',
        trigger_type: 'cron.hourly',
        status: 'CLAIMED',
        executor_id: 'test-dispatcher'
      })
      .select('*')
      .single();

    expect(jobErr).toBeNull();

    // 3. Process job via AIDispatcher
    const dispatcher = new AIDispatcher(admin, 'test-dispatcher');
    await dispatcher.processJob(job);

    // 4. Verify job transitioned to COMPLETED
    const { data: completedJob } = await admin
      .from('ai_jobs')
      .select('status, completed_at')
      .eq('id', job.id)
      .single();

    expect(completedJob?.status).toBe('COMPLETED');
    expect(completedJob?.completed_at).toBeTruthy();

    // 5. Verify real insight was generated and references the real overdue task ID
    const { data: insights } = await admin
      .from('ai_insights')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_id', task!.id);

    expect(insights?.length).toBeGreaterThanOrEqual(1);
    expect(insights![0].content).toContain('Emergency Critical Security Patch');
    expect(insights![0].type).toBe('NEEDS_ATTENTION');
    expect(insights![0].confidence).toBe(100);

    // 6. Deduplication check: re-running proactive analysis does not insert duplicate insight for same task
    const { data: job2 } = await (admin.from('ai_jobs') as any)
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        job_type: 'PROACTIVE',
        trigger_type: 'cron.hourly',
        status: 'CLAIMED',
        executor_id: 'test-dispatcher-2'
      })
      .select('*')
      .single();

    await dispatcher.processJob(job2);

    const { data: insightsAfter } = await admin
      .from('ai_insights')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('entity_id', task!.id);

    expect(insightsAfter?.length).toBe(1); // Deduplication maintained!
  }, 20000);

  // 6.3 Governance Enforcement in Background Dispatcher
  it('6.3 [Governance Boundary]: Dispatcher rejects execution and fails job if workspace policy disables AI', async () => {
    const admin = ctx.adminClient;
    const workspaceId = ctx.wsB.id;
    const userId = ctx.userB.id;

    // 1. Explicitly disable AI in workspace policy for Workspace B
    await (admin.from('ai_workspace_policies') as any).upsert({
      workspace_id: workspaceId,
      ai_enabled: false
    });

    // 2. Create a job for Workspace B
    const { data: job } = await (admin.from('ai_jobs') as any).insert({
      workspace_id: workspaceId,
      user_id: userId,
      job_type: 'PROACTIVE',
      trigger_type: 'event.trigger',
      status: 'CLAIMED',
      executor_id: 'gov-worker'
    }).select('*').single();

    // 3. Process job
    const dispatcher = new AIDispatcher(admin, 'gov-worker');
    await dispatcher.processJob(job);

    // 4. Job must be marked FAILED or RECOVERY_PENDING due to governance rejection
    const { data: checkedJob } = await admin
      .from('ai_jobs')
      .select('status, attempt_count')
      .eq('id', job.id)
      .single();

    expect(['FAILED', 'RECOVERY_PENDING']).toContain(checkedJob?.status);
  });
});
