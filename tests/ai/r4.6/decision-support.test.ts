import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDecisionComparison } from '../../../src/lib/ai/decision-support';
import {
  recordDecisionOutcome,
  evaluateDecisionOutcome,
  getWorkspaceOutcomeHistory
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
});
