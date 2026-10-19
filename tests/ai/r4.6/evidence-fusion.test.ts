import { describe, it, expect } from 'vitest';
import {
  fuseEvidence,
  FusedEvidenceItem,
  validateRecommendationEvidence,
  formatGroundedExplanation
} from '../../../src/lib/ai/evidence-fusion';

describe('R4.6 Hybrid Retrieval & Evidence Fusion', () => {
  it('enforces source authority hierarchy when current state conflicts with memory', () => {
    const rawEvidence: FusedEvidenceItem[] = [
      // Current DB says task is Completed
      {
        id: 'ev-1',
        sourceType: 'task',
        sourceId: 'task-100',
        workspaceId: 'ws-1',
        title: 'Auth Bug Fix',
        content: 'Task is marked Done in database',
        authorityLevel: 'authoritative_db',
        retrievalMethod: 'sql',
        metadata: { status: 'Done' }
      },
      // Stale organizational memory says task is Blocked
      {
        id: 'ev-2',
        sourceType: 'task',
        sourceId: 'task-100',
        workspaceId: 'ws-1',
        title: 'Auth Bug Fix blocker',
        content: 'Recorded decision note: Auth bug is blocking mobile launch',
        authorityLevel: 'organizational_memory',
        retrievalMethod: 'memory',
        metadata: { status: 'Blocked' }
      }
    ];

    const report = fuseEvidence(rawEvidence);

    // Should only have 1 fused primary item for task-100
    expect(report.items).toHaveLength(1);
    expect(report.items[0].authorityLevel).toBe('authoritative_db');
    expect(report.items[0].metadata?.status).toBe('Done');

    // Conflict must be explicitly captured and resolved in favor of authoritative_db
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0].entityId).toBe('task-100');
    expect(report.conflicts[0].resolvedInFavorOf).toBe('authoritative_db');
    expect(report.conflicts[0].authoritativeClaim).toContain('Done');
  });

  it('deduplicates identical entities and preserves distinct sources', () => {
    const rawEvidence: FusedEvidenceItem[] = [
      {
        id: 'ev-1',
        sourceType: 'project',
        sourceId: 'p-1',
        workspaceId: 'ws-1',
        title: 'Syncora Core',
        content: 'Primary project details',
        authorityLevel: 'authoritative_db',
        retrievalMethod: 'sql'
      },
      {
        id: 'ev-2',
        sourceType: 'project',
        sourceId: 'p-1',
        workspaceId: 'ws-1',
        title: 'Syncora Core Architecture Doc',
        content: 'Documentation wiki overview',
        authorityLevel: 'semantic_document',
        retrievalMethod: 'semantic'
      },
      {
        id: 'ev-3',
        sourceType: 'task',
        sourceId: 't-1',
        workspaceId: 'ws-1',
        title: 'Unique Task',
        content: 'Some unique task content',
        authorityLevel: 'authoritative_db',
        retrievalMethod: 'sql'
      }
    ];

    const report = fuseEvidence(rawEvidence);

    // Entity map groups p-1 into 1 item, t-1 into 1 item -> total 2 fused items
    expect(report.items).toHaveLength(2);
    expect(report.sources).toHaveLength(2);
    expect(report.summaryContext).toContain('Syncora Core');
    expect(report.summaryContext).toContain('Unique Task');
  });

  describe('R4.9 Evidence Grounding & Validation', () => {
    const fusedReport = fuseEvidence([
      {
        id: 'ev-task-1',
        sourceType: 'task',
        sourceId: 't-overdue-1',
        workspaceId: 'ws-1',
        title: 'Database Migration',
        content: 'Overdue migration task',
        authorityLevel: 'authoritative_db',
        retrievalMethod: 'sql',
        metadata: { status: 'In Progress', due_date: '2026-10-01' }
      }
    ]);

    it('validates recommendation when referenced entities exist and align with evidence', () => {
      const val = validateRecommendationEvidence(
        {
          claim: 'Reassign Database Migration to prevent blocking milestone',
          referencedEntities: [
            { type: 'task', id: 't-overdue-1', expectedStatus: 'In Progress' }
          ]
        },
        fusedReport
      );

      expect(val.isValid).toBe(true);
      expect(val.groundingScore).toBe(1.0);
      expect(val.shouldAbstain).toBe(false);
      expect(val.supportedClaims).toHaveLength(1);
    });

    it('triggers abstention when recommendation is contradicted by live DB state', () => {
      const val = validateRecommendationEvidence(
        {
          claim: 'Resume Database Migration because it is currently Blocked',
          referencedEntities: [
            { type: 'task', id: 't-overdue-1', expectedStatus: 'Blocked' } // DB says 'In Progress'
          ]
        },
        fusedReport
      );

      expect(val.isValid).toBe(false);
      expect(val.shouldAbstain).toBe(true);
      expect(val.contradictions).toHaveLength(1);
      expect(val.abstentionReason).toContain('contradicts verified database evidence');
    });

    it('triggers abstention when referenced entity does not exist in context', () => {
      const val = validateRecommendationEvidence(
        {
          claim: 'Approve Task 9999',
          referencedEntities: [
            { type: 'task', id: 't-hallucinated-9999' }
          ]
        },
        fusedReport
      );

      expect(val.isValid).toBe(false);
      expect(val.shouldAbstain).toBe(true);
      expect(val.missingEntities).toHaveLength(1);
      expect(val.abstentionReason).toContain('Insufficient verified evidence');
    });

    it('formats grounded explanation with executive structure and uncertainty notes', () => {
      const formatted = formatGroundedExplanation({
        recommendation: 'Reassign Database Migration to Senior Lead.',
        whyThisMatters: 'It is 16 days overdue and holds up the API deployment.',
        evidence: ['Verified task status: In Progress (authoritative_db)', 'Due date: 2026-10-01'],
        uncertaintiesOrAssumptions: ['Assumes Senior Lead has capacity this sprint.'],
        suggestedNextSteps: ['Confirm reassignment with team lead']
      });

      expect(formatted).toContain('### Recommendation');
      expect(formatted).toContain('**Why this matters:**');
      expect(formatted).toContain('**Evidence:**');
      expect(formatted).toContain('**Uncertainty & Assumptions:**');
      expect(formatted).toContain('**Suggested Next Steps:**');
    });
  });
});
