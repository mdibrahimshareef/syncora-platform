import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { validateAIRequest, AIGovernanceError } from '../../../src/lib/ai/governance';

// Create a service role client to bypass RLS for testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('AI Governance & Policies (R4.4)', () => {
  const testWorkspaceId = 'test-workspace-gov';
  const testUserId = 'test-user-gov';
  
  beforeEach(async () => {
    // Reset test data
    await supabase.from('ai_workspace_policies').delete().eq('workspace_id', testWorkspaceId);
    await supabase.from('ai_usage_metrics').delete().eq('workspace_id', testWorkspaceId);
    await supabase.from('ai_workflows').delete().eq('workspace_id', testWorkspaceId);
    
    // Ensure workspace exists (create dummy if needed)
    await supabase.from('workspaces').upsert({ id: testWorkspaceId, name: 'Gov Test', slug: 'gov-test' });
    await supabase.auth.admin.createUser({ id: testUserId, email: 'govtest@example.com', password: 'password', email_confirm: true }).catch(() => {});
  });

  afterAll(async () => {
    await supabase.from('workspaces').delete().eq('id', testWorkspaceId);
    await supabase.auth.admin.deleteUser(testUserId).catch(() => {});
  });

  it('should allow request when AI is enabled and limits are not hit', async () => {
    await supabase.from('ai_workspace_policies').insert({
      workspace_id: testWorkspaceId,
      ai_enabled: true,
      max_daily_requests: 100,
    });

    const policy = await validateAIRequest(supabase, testWorkspaceId, testUserId, 'chat');
    expect(policy.ai_enabled).toBe(true);
  });

  it('should throw WORKSPACE_FORBIDDEN when AI is disabled', async () => {
    await supabase.from('ai_workspace_policies').insert({
      workspace_id: testWorkspaceId,
      ai_enabled: false,
    });

    await expect(validateAIRequest(supabase, testWorkspaceId, testUserId, 'chat')).rejects.toThrow(AIGovernanceError);
  });

  it('should throw AI_QUOTA_EXCEEDED when daily limits are hit', async () => {
    await supabase.from('ai_workspace_policies').insert({
      workspace_id: testWorkspaceId,
      ai_enabled: true,
      max_daily_requests: 10,
    });

    const today = new Date().toISOString().split('T')[0];
    await supabase.from('ai_usage_metrics').insert({
      workspace_id: testWorkspaceId,
      user_id: testUserId,
      date: today,
      chat_requests: 10,
    });

    await expect(validateAIRequest(supabase, testWorkspaceId, testUserId, 'chat')).rejects.toThrowError('Daily AI request quota exceeded');
  });

  it('should throw WORKFLOW_RATE_LIMITED when concurrency limits are hit', async () => {
    await supabase.from('ai_workspace_policies').insert({
      workspace_id: testWorkspaceId,
      ai_enabled: true,
      max_concurrent_workflows: 1,
    });

    await supabase.from('ai_workflows').insert({
      id: crypto.randomUUID(),
      workspace_id: testWorkspaceId,
      user_id: testUserId,
      title: 'Active 1',
      plan: {},
      status: 'EXECUTING',
      risk_level: 'low'
    });

    await expect(validateAIRequest(supabase, testWorkspaceId, testUserId, 'workflow_execute')).rejects.toThrowError('Maximum concurrent workflows reached');
  });
});
