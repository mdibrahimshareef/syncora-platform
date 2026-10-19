import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDecisionComparison } from '../../../src/lib/ai/decision-support';
import {
  recordDecisionOutcome,
  evaluateDecisionOutcome,
  getWorkspaceOutcomeHistory,
  computeOutcomeAggregates,
  rankRecommendationsWithOutcomes
} from '../../../src/lib/ai/outcomes';
import { createMockSupabase, createChainable } from '../mock-supabase';

describe('R4.6 Explainable Decision Support & Outcome Feedback', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  describe('Decision Comparison Contracts', () => {
    it('builds a valid structured decision comparison', () => {
      const comparison = buildDecisionComparison(
        'Milestone Alpha is at risk because two critical blocking tasks are overdue.',
        ['Verified 2 overdue tasks', 'Target milestone date is fixed on Oct 25'],
        ['Fixed release deadline', 'No external contractor budget'],
        [
          {
            id: 'opt-a',
            title: 'Reassign to Charlie',
            description: 'Move Task 1 to Charlie who has available capacity.',
            expectedBenefits: ['Accelerates completion without changing deadline'],
            risksAndTradeOffs: ['Increases context switching for Charlie'],
            requiredHumanApprovals: ['Team Lead'],
            confidenceLevel: 'High'
          },
          {
            id: 'opt-b',
            title: 'Reduce Scope',
            description: 'Move Task 2 to Milestone Beta.',
            expectedBenefits: ['Guarantees on-time delivery of core features'],
            risksAndTradeOffs: ['Omits secondary analytics dashboard'],
            requiredHumanApprovals: ['Product Owner'],
            confidenceLevel: 'Medium'
          }
        ],
        'opt-a',
        'Charlie has 12 hours of logged availability this sprint and expertise in this subsystem.'
      );

      expect(comparison.decisionId).toBeDefined();
      expect(comparison.recommendedOptionId).toBe('opt-a');
      expect(comparison.options).toHaveLength(2);
      expect(comparison.mainConstraints).toContain('Fixed release deadline');
      expect(comparison.options[0].expectedBenefits).toHaveLength(1);
    });

    it('throws error if recommended option does not exist in options list', () => {
      expect(() => {
        buildDecisionComparison(
          'Situation',
          [],
          [],
          [{ id: 'opt-1', title: 'Option 1', description: '', expectedBenefits: [], risksAndTradeOffs: [], requiredHumanApprovals: [], confidenceLevel: 'High' }],
          'opt-nonexistent',
          'Rationale'
        );
      }).toThrow('Recommended option "opt-nonexistent" not found');
    });
  });

  describe('Outcome Feedback Loop', () => {
    it('records user decision outcome with context', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'ai_decision_outcomes') {
          return createChainable({
            id: 'outcome-1',
            workspace_id: 'ws-1',
            user_id: 'user-1',
            recommendation_id: 'rec-1',
            user_action: 'accepted',
            action_result: 'pending'
          });
        }
        return createChainable(null);
      });

      const outcome = await recordDecisionOutcome(mockSupabase, {
        workspaceId: 'ws-1',
        userId: 'user-1',
        recommendationId: 'rec-1',
        recommendationType: 'task_reassignment',
        decisionContext: {
          situation: 'Overdue task bottleneck',
          options: [{ id: 'opt-a', title: 'Reassign' }],
          recommendedOptionId: 'opt-a'
        },
        userAction: 'accepted'
      });

      expect(outcome.id).toBe('outcome-1');
      expect(outcome.user_action).toBe('accepted');
      expect(mockSupabase.from).toHaveBeenCalledWith('ai_decision_outcomes');
    });

    it('evaluates observed outcome and records user feedback score', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'ai_decision_outcomes') {
          return createChainable({
            id: 'outcome-1',
            action_result: 'executed_verified',
            observed_outcome: 'positive',
            feedback_score: 1,
            outcome_notes: 'Blocker was successfully resolved 2 days ahead of milestone.'
          });
        }
        return createChainable(null);
      });

      const updated = await evaluateDecisionOutcome(mockSupabase, {
        outcomeId: 'outcome-1',
        workspaceId: 'ws-1',
        actionResult: 'executed_verified',
        observedOutcome: 'positive',
        feedbackScore: 1,
        outcomeNotes: 'Blocker was successfully resolved 2 days ahead of milestone.'
      });

      expect(updated.action_result).toBe('executed_verified');
      expect(updated.observed_outcome).toBe('positive');
      expect(updated.feedback_score).toBe(1);
    });

    it('retrieves workspace outcome history', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'ai_decision_outcomes') {
          return createChainable([
            { id: 'out-1', recommendation_type: 'task_reassignment', user_action: 'accepted' },
            { id: 'out-2', recommendation_type: 'deadline_adjustment', user_action: 'rejected' }
          ]);
        }
        return createChainable(null);
      });

      const history = await getWorkspaceOutcomeHistory(mockSupabase, 'ws-1', { limit: 10 });
      expect(history).toHaveLength(2);
    });
  });

  describe('R4.9 Outcome-Informed Recommendation Ranking', () => {
    const historicalOutcomes: any[] = [
      {
        id: 'out-1',
        workspace_id: 'ws-1',
        recommendation_type: 'task_reassignment',
        user_action: 'accepted',
        observed_outcome: 'positive',
        feedback_score: 1
      },
      {
        id: 'out-2',
        workspace_id: 'ws-1',
        recommendation_type: 'task_reassignment',
        user_action: 'accepted',
        observed_outcome: 'positive',
        feedback_score: 1
      },
      {
        id: 'out-3',
        workspace_id: 'ws-1',
        recommendation_type: 'task_reassignment',
        user_action: 'accepted',
        observed_outcome: 'positive',
        feedback_score: 1
      },
      {
        id: 'out-4',
        workspace_id: 'ws-1',
        recommendation_type: 'deadline_extension',
        user_action: 'rejected',
        observed_outcome: 'negative',
        feedback_score: -1
      },
      {
        id: 'out-5',
        workspace_id: 'ws-1',
        recommendation_type: 'deadline_extension',
        user_action: 'rejected',
        observed_outcome: 'negative',
        feedback_score: -1
      },
      {
        id: 'out-6',
        workspace_id: 'ws-1',
        recommendation_type: 'deadline_extension',
        user_action: 'ignored',
        observed_outcome: 'negative',
        feedback_score: -1
      },
      // Outcome belonging to a foreign workspace (ws-foreign)
      {
        id: 'out-foreign',
        workspace_id: 'ws-foreign',
        recommendation_type: 'scope_reduction',
        user_action: 'accepted',
        observed_outcome: 'positive',
        feedback_score: 1
      }
    ];

    it('computes smoothed outcome aggregates with Laplace prior', () => {
      const statsReassign = computeOutcomeAggregates(historicalOutcomes, 'task_reassignment');
      expect(statsReassign.isSufficient).toBe(true);
      expect(statsReassign.positiveCount).toBe(3);
      // (3 + 2) / (3 + 4) = 5/7 ≈ 0.7143
      expect(statsReassign.empiricalBayesScore).toBe(0.7143);

      const statsSparse = computeOutcomeAggregates(historicalOutcomes, 'unseen_type');
      expect(statsSparse.isSufficient).toBe(false);
      // (0 + 2) / (0 + 4) = 2/4 = 0.50 (neutral prior)
      expect(statsSparse.empiricalBayesScore).toBe(0.5);
    });

    it('prioritizes high-performing recommendation types when outcome data is sufficient', () => {
      const candidates = [
        {
          id: 'rec-extend',
          recommendationType: 'deadline_extension',
          title: 'Extend deadline by 1 week',
          urgency: 'high' as const,
          evidenceStrength: 0.90
        },
        {
          id: 'rec-reassign',
          recommendationType: 'task_reassignment',
          title: 'Reassign overdue task to available engineer',
          urgency: 'high' as const,
          evidenceStrength: 0.90
        }
      ];

      const ranked = rankRecommendationsWithOutcomes(candidates, historicalOutcomes, {
        targetWorkspaceId: 'ws-1',
        enableOutcomeRanking: true
      });

      expect(ranked[0].id).toBe('rec-reassign');
      expect(ranked[0].compositeRankScore).toBeGreaterThan(ranked[1].compositeRankScore);
      expect(ranked[0].rankingExplanation).toContain('Rank #1');
      expect(ranked[0].outcomeBoost).toBeGreaterThan(0);
    });

    it('strictly isolates historical outcomes by workspace boundary', () => {
      const candidates = [
        {
          id: 'rec-scope',
          recommendationType: 'scope_reduction',
          title: 'Cut scope',
          urgency: 'medium' as const,
          evidenceStrength: 0.8
        }
      ];

      // Target workspace ws-1 has NO scope_reduction outcomes (only ws-foreign does)
      const ranked = rankRecommendationsWithOutcomes(candidates, historicalOutcomes, {
        targetWorkspaceId: 'ws-1',
        enableOutcomeRanking: true
      });

      // Must fall back to baseline since ws-1 has 0 outcomes for scope_reduction
      expect(ranked[0].historicalStats?.totalCount).toBe(0);
      expect(ranked[0].rankingExplanation).toContain('insufficient historical samples');
    });

    it('falls back to deterministic urgency and evidence ranking when outcome ranking is disabled', () => {
      const candidates = [
        {
          id: 'rec-crit',
          recommendationType: 'deadline_extension',
          title: 'Critical issue action',
          urgency: 'critical' as const,
          evidenceStrength: 0.95
        },
        {
          id: 'rec-med',
          recommendationType: 'task_reassignment',
          title: 'Medium issue action',
          urgency: 'medium' as const,
          evidenceStrength: 0.80
        }
      ];

      const ranked = rankRecommendationsWithOutcomes(candidates, historicalOutcomes, {
        targetWorkspaceId: 'ws-1',
        enableOutcomeRanking: false // User disabled outcome-informed ranking
      });

      expect(ranked[0].id).toBe('rec-crit');
      expect(ranked[0].rankingExplanation).toContain('outcome ranking disabled');
    });
  });
});
