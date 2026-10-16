import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeTemporalProjectRisks } from '../../../src/lib/ai/temporal-reasoning';
import { createMockSupabase, createChainable } from '../mock-supabase';

describe('R4.6 Temporal Reasoning & Risk Propagation', () => {
  let mockSupabase: any;
  const fixedNow = new Date('2026-10-16T12:00:00Z');

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('separates deterministic signals from predictive estimates cleanly', async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'projects') {
        return createChainable({
          id: 'proj-1',
          name: 'Platform 4.6',
          due_date: '2026-10-25T00:00:00Z', // 9 days remaining
          status: 'In Progress'
        });
      }
      if (table === 'tasks') {
        return createChainable([
          // Completed task
          { id: 't1', title: 'Init', status: 'Done', due_date: '2026-10-10T00:00:00Z' },
          // Overdue task (due 2 days ago)
          { id: 't2', title: 'Data Schema', status: 'Blocked', due_date: '2026-10-14T00:00:00Z' },
          // Imminent task (due in 24 hours)
          { id: 't3', title: 'API Integration', status: 'Todo', due_date: '2026-10-17T12:00:00Z' }
        ]);
      }
      if (table === 'milestones') {
        return createChainable([
          { id: 'm1', name: 'Alpha Gate', due_date: '2026-10-20T00:00:00Z', status: 'In Progress' }
        ]);
      }
      if (table === 'task_dependencies') {
        return createChainable([
          // t2 (overdue) blocks t3 (imminent)
          { task_id: 't3', depends_on_task_id: 't2', type: 'blocking' }
        ]);
      }
      return createChainable(null);
    });

    const analysis = await analyzeTemporalProjectRisks(mockSupabase, 'ws-1', 'proj-1', fixedNow);

    expect(analysis.projectName).toBe('Platform 4.6');
    expect(analysis.daysRemaining).toBe(9);
    expect(analysis.completionRatePercent).toBe(33); // 1 of 3 tasks completed

    // 1. Deterministic signals must be present
    expect(analysis.deterministicSignals.length).toBeGreaterThan(0);
    const overdueSignal = analysis.deterministicSignals.find(s => s.category === 'overdue_slip');
    expect(overdueSignal).toBeDefined();
    expect(overdueSignal?.severity).toBe('high');

    const imminentSignal = analysis.deterministicSignals.find(s => s.category === 'deadline_imminent');
    expect(imminentSignal).toBeDefined();
    expect(imminentSignal?.title).toContain('API Integration');

    // 2. Predictive estimates must communicate uncertainty and assumptions
    expect(analysis.predictiveEstimates.length).toBeGreaterThan(0);
    const prediction = analysis.predictiveEstimates[0];
    expect(prediction.predictedEvent).toBeDefined();
    expect(prediction.timeHorizon).toBeDefined();
    expect(prediction.supportingEvidence.length).toBeGreaterThan(0);
    expect(prediction.keyAssumptions.length).toBeGreaterThan(0);
    expect(['Low', 'Medium', 'High']).toContain(prediction.uncertaintyLevel);
    expect(prediction.suggestedAction).toBeDefined();

    // 3. Evidence sources
    expect(analysis.sources).toHaveLength(1);
    expect(analysis.sources[0].sourceKind).toBe('analysis');
  });

  it('handles projects without due dates gracefully', async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'projects') {
        return createChainable({
          id: 'proj-open',
          name: 'Continuous Maintenance',
          due_date: null,
          status: 'In Progress'
        });
      }
      if (table === 'tasks') {
        return createChainable([
          { id: 't1', title: 'Task 1', status: 'In Progress', due_date: null }
        ]);
      }
      if (table === 'milestones') return createChainable([]);
      if (table === 'task_dependencies') return createChainable([]);
      return createChainable(null);
    });

    const analysis = await analyzeTemporalProjectRisks(mockSupabase, 'ws-1', 'proj-open', fixedNow);

    expect(analysis.daysRemaining).toBeNull();
    expect(analysis.deterministicSignals).toHaveLength(0);
    expect(analysis.predictiveEstimates).toHaveLength(0);
  });
});
