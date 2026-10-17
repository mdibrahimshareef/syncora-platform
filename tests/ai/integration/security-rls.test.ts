import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment, TestContext } from './test-env';

describe('R4.7 Live Supabase Security & RLS Audit (Section 5)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestEnvironment();
  }, 30000);

  afterAll(async () => {
    if (ctx) {
      await teardownTestEnvironment(ctx);
    }
  });

  // 5.2.1 Workspace Memory Isolation
  it('5.2.1 [Workspace Memory Isolation]: User B cannot view Workspace A workspace memories', async () => {
    const { clientA, clientB, wsA } = ctx;

    // User A inserts a workspace-scoped memory in Workspace A (user_id is NULL for workspace-wide scope)
    const { data: memA, error: insertErrA } = await clientA
      .from('ai_memories')
      .insert({
        workspace_id: wsA.id,
        user_id: null,
        scope: 'workspace',
        category: 'decision_rationale',
        content: 'Confidential Workspace A Strategy Document',
        source_type: 'explicit_user',
        confidence: 100
      })
      .select('id, content')
      .single();

    expect(insertErrA).toBeNull();
    expect(memA?.content).toContain('Confidential');

    // User A can read it
    const { data: readA } = await clientA
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', wsA.id);
    expect(readA?.some(m => m.id === memA?.id)).toBe(true);

    // Negative Test: User B querying Workspace A must be denied by RLS (returns empty set)
    const { data: readB, error: readBErr } = await clientB
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', wsA.id);

    expect(readBErr).toBeNull();
    expect(readB).toHaveLength(0); // RLS strictly filters out foreign workspace rows
  });

  // 5.2.2 Private User Memory Isolation in Shared Workspace
  it('5.2.2 [Private User Memory]: In a shared collaborative workspace, User B cannot view User A private user memory', async () => {
    const { clientA, clientB, wsShared, userA } = ctx;

    // User A creates a user-scoped private memory in the collaborative shared workspace
    const { data: privateMem, error: privErr } = await clientA
      .from('ai_memories')
      .insert({
        workspace_id: wsShared.id,
        user_id: userA.id,
        scope: 'user',
        category: 'user_preference',
        content: 'User A Private Salary Review Note',
        source_type: 'explicit_user',
        confidence: 100
      })
      .select('id')
      .single();

    expect(privErr).toBeNull();

    // User A can read their own user memory
    const { data: readSelf } = await clientA
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', wsShared.id)
      .eq('scope', 'user');

    expect(readSelf?.some(m => m.id === privateMem?.id)).toBe(true);

    // User B (collaborator in wsShared) queries all memories in wsShared
    const { data: readSharedByB } = await clientB
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', wsShared.id);

    // User B must NOT see User A's private user memory!
    expect(readSharedByB?.some(m => m.id === privateMem?.id)).toBe(false);
  });

  // 5.2.3 Unauthorized Memory Writes Denied
  it('5.2.3 [Unauthorized Write Rejection]: User B cannot insert or delete memories in Workspace A', async () => {
    const { clientB, wsA, adminClient } = ctx;

    // 1. Unauthorized Insert: User B tries to insert into Workspace A (foreign workspace)
    const { data: insertData, error: insertError } = await clientB
      .from('ai_memories')
      .insert({
        workspace_id: wsA.id,
        user_id: null,
        scope: 'workspace',
        category: 'project_objective',
        content: 'Malicious Injected Memory',
        source_type: 'system_observation'
      })
      .select('id');

    // Must be rejected by RLS WITH CHECK policy!
    expect(insertError).toBeTruthy();
    expect(insertData).toBeNull();

    // 2. Unauthorized Delete: User B attempts to delete a memory in Workspace A
    const { data: targetMem, error: seedErr } = await (adminClient.from('ai_memories') as any)
      .insert({
        workspace_id: wsA.id,
        user_id: null,
        scope: 'workspace',
        category: 'decision_rationale',
        content: 'Protected memory',
        source_type: 'explicit_user'
      })
      .select('id')
      .single();

    expect(seedErr).toBeNull();
    expect(targetMem?.id).toBeTruthy();

    const { data: deleteRes } = await clientB
      .from('ai_memories')
      .delete()
      .eq('id', targetMem.id)
      .select('id');

    // User B cannot delete (0 rows deleted)
    expect(deleteRes?.length || 0).toBe(0);

    // Verify it still exists in the DB
    const { data: stillExists } = await adminClient
      .from('ai_memories')
      .select('id')
      .eq('id', targetMem.id)
      .single();
    expect(stillExists?.id).toBe(targetMem.id);
  });

  // 5.3 Decision Outcomes Isolation and User Integrity
  it('5.3 [Decision Outcomes Isolation]: User B cannot view Workspace A outcomes or forge outcomes for User A', async () => {
    const { clientA, clientB, wsA, userA } = ctx;

    // User A records an outcome in Workspace A
    const { data: outcomeA, error: outErrA } = await clientA
      .from('ai_decision_outcomes')
      .insert({
        workspace_id: wsA.id,
        user_id: userA.id,
        recommendation_id: 'rec-123',
        recommendation_type: 'task_reassignment',
        decision_context: { summary: 'Reassign task to meet milestone' },
        user_action: 'accepted',
        outcome_notes: 'Looks good',
        feedback_score: 1
      })
      .select('id')
      .single();

    expect(outErrA).toBeNull();
    expect(outcomeA?.id).toBeTruthy();

    // User B reads Workspace A outcomes -> 0 rows (RLS denied)
    const { data: readB } = await clientB
      .from('ai_decision_outcomes')
      .select('*')
      .eq('workspace_id', wsA.id);
    expect(readB).toHaveLength(0);

    // Forgery negative test: User B tries to record an outcome in Workspace A pretending to be User A
    const { data: forgeData, error: forgeError } = await clientB
      .from('ai_decision_outcomes')
      .insert({
        workspace_id: wsA.id,
        user_id: userA.id, // Forgery attempt!
        recommendation_id: 'rec-forged',
        recommendation_type: 'deadline_adjustment',
        decision_context: { forged: true },
        user_action: 'rejected'
      })
      .select('id');

    // RLS WITH CHECK (workspace_id IN (...) AND user_id = auth.uid()) rejects this!
    expect(forgeError).toBeTruthy();
    expect(forgeData).toBeNull();
  });

  // 5.4 AI Jobs RLS Isolation
  it('5.4 [AI Jobs Isolation]: Authenticated users cannot view or insert jobs in foreign workspaces', async () => {
    const { clientA, clientB, wsA, userA } = ctx;

    // User A creates a job in Workspace A
    const { data: jobA, error: jobAErr } = await clientA
      .from('ai_jobs')
      .insert({
        workspace_id: wsA.id,
        user_id: userA.id,
        job_type: 'PROACTIVE',
        trigger_type: 'test.rls_check',
        status: 'QUEUED'
      })
      .select('id')
      .single();

    expect(jobAErr).toBeNull();
    expect(jobA?.id).toBeTruthy();

    // User B querying Workspace A jobs gets 0 rows
    const { data: foreignJobs } = await clientB
      .from('ai_jobs')
      .select('*')
      .eq('workspace_id', wsA.id);

    expect(foreignJobs).toHaveLength(0);

    // User B inserting a job into Workspace A is rejected by RLS
    const { data: badJob, error: badJobError } = await clientB
      .from('ai_jobs')
      .insert({
        workspace_id: wsA.id,
        user_id: ctx.userB.id,
        job_type: 'PROACTIVE',
        trigger_type: 'test.unauthorized',
        status: 'QUEUED'
      })
      .select('id');

    expect(badJobError).toBeTruthy();
    expect(badJob).toBeNull();
  });

  // 5.5 Membership Revocation
  it('5.5 [Membership Revocation]: Revoking workspace membership immediately terminates data access', async () => {
    const { clientB, wsShared, adminClient, userB } = ctx;

    // Seed a memory in the shared workspace (scope = workspace, user_id = null)
    const { data: sharedMem, error: seedErr } = await (adminClient.from('ai_memories') as any)
      .insert({
        workspace_id: wsShared.id,
        user_id: null,
        scope: 'workspace',
        category: 'goal_priority',
        content: 'Pre-revocation shared strategic priority',
        source_type: 'explicit_user'
      })
      .select('id')
      .single();

    expect(seedErr).toBeNull();

    // 1. User B is currently a member and can read the workspace memory
    const { data: readBefore } = await clientB
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', wsShared.id);

    expect(readBefore?.some(m => m.id === sharedMem.id)).toBe(true);

    // 2. Revoke User B's membership from workspace_members
    const { error: deleteMemberErr } = await adminClient
      .from('workspace_members')
      .delete()
      .eq('workspace_id', wsShared.id)
      .eq('user_id', userB.id);

    expect(deleteMemberErr).toBeNull();

    // 3. User B immediately queries the shared workspace again
    const { data: readAfter, error: readAfterErr } = await clientB
      .from('ai_memories')
      .select('*')
      .eq('workspace_id', wsShared.id);

    expect(readAfterErr).toBeNull();
    // After revocation, RLS immediately denies all access (returns 0 rows)!
    expect(readAfter).toHaveLength(0);
  });
});
