import { SupabaseClient } from '@supabase/supabase-js';

export type AIRequestType = 'chat' | 'workflow_create' | 'workflow_execute' | 'workflow_resume' | 'workflow_retry' | 'action';

export type WorkspaceAIPolicy = {
  ai_enabled: boolean;
  max_workflow_steps: number;
  max_concurrent_workflows: number;
  max_daily_requests: number;
  require_action_approval: boolean;
  allow_ai_task_creation: boolean;
  allow_ai_task_assignment: boolean;
  allow_ai_task_updates: boolean;
};

export class AIGovernanceError extends Error {
  public code: string;
  public retryAfter?: number;

  constructor(message: string, code: string, retryAfter?: number) {
    super(message);
    this.name = 'AIGovernanceError';
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export async function getWorkspaceAIPolicy(supabase: SupabaseClient, workspaceId: string): Promise<WorkspaceAIPolicy> {
  const { data: policy, error } = await supabase
    .from('ai_workspace_policies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !policy) {
    // Return default conservative policy if none found
    return {
      ai_enabled: true,
      max_workflow_steps: 10,
      max_concurrent_workflows: 2,
      max_daily_requests: 1000,
      require_action_approval: true,
      allow_ai_task_creation: true,
      allow_ai_task_assignment: true,
      allow_ai_task_updates: true,
    };
  }
  return policy as WorkspaceAIPolicy;
}

export async function validateAIRequest(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  requestType: AIRequestType
): Promise<WorkspaceAIPolicy> {
  const policy = await getWorkspaceAIPolicy(supabase, workspaceId);

  if (!policy.ai_enabled) {
    throw new AIGovernanceError('AI is disabled for this workspace', 'WORKSPACE_FORBIDDEN');
  }

  // 1. Check daily rate limits / quotas
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('ai_usage_metrics')
    .select('chat_requests, workflow_requests, action_requests')
    .eq('workspace_id', workspaceId)
    .eq('date', today)
    .single();

  if (usage) {
    const totalRequests = (usage.chat_requests || 0) + (usage.workflow_requests || 0) + (usage.action_requests || 0);
    if (totalRequests >= policy.max_daily_requests) {
      throw new AIGovernanceError('Daily AI request quota exceeded', 'AI_QUOTA_EXCEEDED');
    }
  }

  // 2. Concurrency checks
  if (['workflow_create', 'workflow_execute', 'workflow_resume', 'workflow_retry'].includes(requestType)) {
    const { count } = await supabase
      .from('ai_workflows')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['EXECUTING', 'RECOVERING', 'VERIFYING']);
    
    if (count !== null && count >= policy.max_concurrent_workflows) {
      throw new AIGovernanceError('Maximum concurrent workflows reached', 'WORKFLOW_RATE_LIMITED');
    }
  }

  return policy;
}

export async function recordAIUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  metrics: {
    requestType: AIRequestType;
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
  }
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const p_chat_inc = metrics.requestType === 'chat' ? 1 : 0;
  const p_workflow_inc = metrics.requestType.startsWith('workflow') ? 1 : 0;
  const p_action_inc = metrics.requestType === 'action' ? 1 : 0;

  await supabase.rpc('increment_ai_usage', {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_date: today,
    p_chat_inc,
    p_workflow_inc,
    p_action_inc,
    p_input_tokens_inc: metrics.inputTokens || 0,
    p_output_tokens_inc: metrics.outputTokens || 0,
    p_cost_inc: metrics.estimatedCost || 0
  });
}

export async function checkWorkspaceAdmin(supabase: SupabaseClient, workspaceId: string): Promise<boolean> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return false;

  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return false;
  return data.role === 'admin' || data.role === 'owner';
}

