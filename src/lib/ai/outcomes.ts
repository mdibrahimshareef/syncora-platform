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

export interface RecommendationOutcomeStats {
  recommendationType: string;
  totalCount: number;
  acceptedCount: number;
  positiveCount: number;
  negativeCount: number;
  empiricalBayesScore: number;
  isSufficient: boolean;
}

/**
 * Computes smoothed statistical outcome metrics for a specific recommendation type.
 * Uses Laplace prior (alpha=2, beta=2) to avoid small-sample volatility.
 */
export function computeOutcomeAggregates(
  outcomes: DecisionOutcomeRecord[],
  recommendationType: string
): RecommendationOutcomeStats {
  const matching = outcomes.filter(o => o.recommendation_type === recommendationType);
  const totalCount = matching.length;
  
  let acceptedCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  for (const o of matching) {
    if (o.user_action === 'accepted') acceptedCount++;
    if (o.observed_outcome === 'positive' || (o.feedback_score !== undefined && o.feedback_score !== null && o.feedback_score > 0)) {
      positiveCount++;
    } else if (o.observed_outcome === 'negative' || (o.feedback_score !== undefined && o.feedback_score !== null && o.feedback_score < 0)) {
      negativeCount++;
    }
  }

  // Empirical Bayes prior: baseline center 0.5 with prior weight = 4
  const empiricalBayesScore = Number(((positiveCount + 2) / (totalCount + 4)).toFixed(4));
  const isSufficient = totalCount >= 3;

  return {
    recommendationType,
    totalCount,
    acceptedCount,
    positiveCount,
    negativeCount,
    empiricalBayesScore,
    isSufficient
  };
}

export interface RecommendationCandidate {
  id: string;
  recommendationType: string;
  title: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  evidenceStrength: number;
  action?: {
    tool: string;
    args: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export interface RankedRecommendation extends RecommendationCandidate {
  compositeRankScore: number;
  outcomeBoost: number;
  rankingExplanation: string;
  historicalStats?: RecommendationOutcomeStats;
}

/**
 * Prioritizes recommendation candidates using evidence strength, urgency, and historical outcomes.
 * Guarantees strict workspace isolation: outcomes from other workspaces are never applied.
 * Falls back to deterministic evidence & urgency ordering when historical data is sparse (< 3 samples).
 */
export function rankRecommendationsWithOutcomes(
  candidates: RecommendationCandidate[],
  historicalOutcomes: DecisionOutcomeRecord[],
  options: {
    targetWorkspaceId: string;
    enableOutcomeRanking?: boolean;
  }
): RankedRecommendation[] {
  // Hard isolation gate: strictly filter outcomes to target workspace
  const scopedOutcomes = historicalOutcomes.filter(o => o.workspace_id === options.targetWorkspaceId);
  const enableRanking = options.enableOutcomeRanking !== false;

  const urgencyWeights: Record<string, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.50,
    low: 0.25
  };

  const scoredList = candidates.map(candidate => {
    const urgencyWeight = urgencyWeights[candidate.urgency] ?? 0.5;
    const evidenceScore = Math.min(1.0, Math.max(0.0, candidate.evidenceStrength));
    const stats = computeOutcomeAggregates(scopedOutcomes, candidate.recommendationType);

    let compositeRankScore: number;
    let outcomeBoost = 0;
    let explanationReason = '';

    if (enableRanking && stats.isSufficient) {
      const outcomeScore = stats.empiricalBayesScore;
      outcomeBoost = Number((outcomeScore - 0.5).toFixed(4));
      compositeRankScore = Number((
        (evidenceScore * 0.45) +
        (urgencyWeight * 0.35) +
        (outcomeScore * 0.20)
      ).toFixed(4));
      explanationReason = `${candidate.urgency.toUpperCase()} urgency, verified evidence (${Math.round(evidenceScore * 100)}%), and positive historical outcome track record (${Math.round(outcomeScore * 100)}% across ${stats.totalCount} events)`;
    } else {
      // Deterministic fallback based purely on evidence and urgency
      compositeRankScore = Number((
        (evidenceScore * 0.55) +
        (urgencyWeight * 0.45)
      ).toFixed(4));
      const reasonSuffix = !enableRanking ? 'outcome ranking disabled' : 'insufficient historical samples';
      explanationReason = `${candidate.urgency.toUpperCase()} urgency and verified evidence (${Math.round(evidenceScore * 100)}%) (baseline ranking: ${reasonSuffix})`;
    }

    return {
      ...candidate,
      compositeRankScore,
      outcomeBoost,
      rankingExplanation: explanationReason,
      historicalStats: stats
    };
  });

  // Sort descending by compositeRankScore
  scoredList.sort((a, b) => b.compositeRankScore - a.compositeRankScore);

  // Annotate ordinal rank
  return scoredList.map((item, index) => ({
    ...item,
    rankingExplanation: `Rank #${index + 1}: ${item.rankingExplanation}`
  }));
}
