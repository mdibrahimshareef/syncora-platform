import { SupabaseClient } from '@supabase/supabase-js';
import { DecisionOutcomeRecord } from '@/types/ai-memory';

export interface RecordOutcomeInput {
  workspaceId: string;
  userId: string;
  recommendationId: string;
  recommendationType: string;
  decisionContext: {
    situation: string;
    constraints?: string[];
    options: Array<{
      id: string;
      title: string;
      tradeOffs?: string;
    }>;
    recommendedOptionId?: string;
  };
  userAction: 'accepted' | 'rejected' | 'modified' | 'ignored';
  rejectionReason?: string;
  modificationDetails?: Record<string, unknown>;
  workflowId?: string;
}

export interface EvaluateOutcomeInput {
  outcomeId: string;
  workspaceId: string;
  actionResult?: 'pending' | 'executed_verified' | 'executed_unverified' | 'failed' | 'skipped';
  observedOutcome?: 'positive' | 'negative' | 'neutral' | 'pending_observation';
  outcomeNotes?: string;
  feedbackScore?: number; // -1 to 1
}

/**
 * Durably records user interaction with an AI decision recommendation.
 */
export async function recordDecisionOutcome(
  supabase: SupabaseClient,
  input: RecordOutcomeInput
): Promise<DecisionOutcomeRecord> {
  const insertData = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    recommendation_id: input.recommendationId,
    recommendation_type: input.recommendationType,
    decision_context: input.decisionContext,
    user_action: input.userAction,
    rejection_reason: input.rejectionReason || null,
    modification_details: input.modificationDetails || null,
    workflow_id: input.workflowId || null,
    action_result: 'pending',
    observed_outcome: 'pending_observation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ai_decision_outcomes')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to record decision outcome: ${error?.message || 'Database error'}`);
  }

  return data as DecisionOutcomeRecord;
}

/**
 * Updates an outcome record with real post-execution evaluation or user feedback.
 */
export async function evaluateDecisionOutcome(
  supabase: SupabaseClient,
  input: EvaluateOutcomeInput
): Promise<DecisionOutcomeRecord> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    evaluated_at: new Date().toISOString()
  };

  if (input.actionResult !== undefined) updates.action_result = input.actionResult;
  if (input.observedOutcome !== undefined) updates.observed_outcome = input.observedOutcome;
  if (input.outcomeNotes !== undefined) updates.outcome_notes = input.outcomeNotes;
  if (input.feedbackScore !== undefined) updates.feedback_score = input.feedbackScore;

  const { data, error } = await supabase
    .from('ai_decision_outcomes')
    .update(updates)
    .eq('id', input.outcomeId)
    .eq('workspace_id', input.workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update decision outcome: ${error?.message || 'Database error'}`);
  }

  return data as DecisionOutcomeRecord;
}

/**
 * Retrieves historical outcome records for a workspace.
 */
export async function getWorkspaceOutcomeHistory(
  supabase: SupabaseClient,
  workspaceId: string,
  options: {
    limit?: number;
    recommendationType?: string;
  } = {}
): Promise<DecisionOutcomeRecord[]> {
  const limit = Math.min(options.limit || 20, 50);
  let q = supabase
    .from('ai_decision_outcomes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.recommendationType) {
    q = q.eq('recommendation_type', options.recommendationType);
  }

  const { data } = await q;
  return (data || []) as DecisionOutcomeRecord[];
}
