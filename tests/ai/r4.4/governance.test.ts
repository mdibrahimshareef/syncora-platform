import { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeEach } from 'vitest';
import { validateAIRequest, AIGovernanceError } from '../../../src/lib/ai/governance';
import { createMockSupabase, createChainable } from '../mock-supabase';

const mockSupabase = createMockSupabase();

describe('AI Governance & Policies (R4.4)', () => {
  const testWorkspaceId = 'test-workspace-gov';
  const testUserId = 'test-user-gov';

  beforeEach(() => {
    // Reset mock defaults before each test
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ai_workspace_policies') {
        return createChainable({ ai_enabled: true, max_daily_requests: 100, max_concurrent_workflows: 2 });
      }
      if (table === 'ai_usage_metrics') {
        return createChainable({ chat_requests: 0, workflow_requests: 0, action_requests: 0 });
      }
      if (table === 'ai_workflows') {
        // Return count 0 for concurrent checks
        return createChainable(null, null, 0);
      }
      return createChainable(null);
    });
  });

  it('should allow request when AI is enabled and limits are not hit', async () => {
    const policy = await validateAIRequest(mockSupabase  as SupabaseClient, testWorkspaceId, testUserId, 'chat');
    expect(policy.ai_enabled).toBe(true);
  });

  it('should throw WORKSPACE_FORBIDDEN when AI is disabled', async () => {
    mockSupabase.from.mockImplementationOnce((table: string) => {
      if (table === 'ai_workspace_policies') {
        return createChainable({ ai_enabled: false });
      }
      return createMockSupabase().from(table);
    });

    await expect(validateAIRequest(mockSupabase  as SupabaseClient, testWorkspaceId, testUserId, 'chat')).rejects.toThrowError(AIGovernanceError);
  });

  it('should throw AI_QUOTA_EXCEEDED when daily limits are hit', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ai_workspace_policies') {
        return createChainable({ ai_enabled: true, max_daily_requests: 10 });
      }
      if (table === 'ai_usage_metrics') {
        return createChainable({ chat_requests: 10, workflow_requests: 0, action_requests: 0 });
      }
      return createChainable(null);
    });

    await expect(validateAIRequest(mockSupabase  as SupabaseClient, testWorkspaceId, testUserId, 'chat')).rejects.toThrowError('Daily AI request quota exceeded');
  });

  it('should throw WORKFLOW_RATE_LIMITED when concurrency limits are hit', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ai_workspace_policies') {
        return createChainable({ ai_enabled: true, max_concurrent_workflows: 1 });
      }
      if (table === 'ai_workflows') {
        // Mock count = 1
        return createChainable(null, null, 1);
      }
      return createChainable(null);
    });

    await expect(validateAIRequest(mockSupabase  as SupabaseClient, testWorkspaceId, testUserId, 'workflow_execute')).rejects.toThrowError('Maximum concurrent workflows reached');
  });
});
