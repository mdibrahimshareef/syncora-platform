import { describe, it, expect } from 'vitest';
import { fuseEvidence, FusedEvidenceItem } from '../../../src/lib/ai/evidence-fusion';

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
});
