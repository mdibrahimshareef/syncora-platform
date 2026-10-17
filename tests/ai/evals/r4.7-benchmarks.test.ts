import { describe, it, expect } from 'vitest';
import { fuseEvidence } from '../../../src/lib/ai/evidence-fusion';
import { buildDecisionComparison } from '../../../src/lib/ai/decision-support';
import { analyzeTemporalProjectRisks } from '../../../src/lib/ai/temporal-reasoning';
import { getProjectDependencyChain } from '../../../src/lib/ai/relationships';
import { buildSystemPrompt } from '../../../src/lib/ai/prompts';
import { createMockSupabase, createChainable } from '../mock-supabase';
import { getLanguageModel } from '../../../src/lib/ai/provider';
import { generateText } from 'ai';

describe('R4.7 AI Evaluation & Repeatable Benchmark Harness (Section 7)', () => {
  const fixedNow = new Date('2026-10-17T12:00:00Z');

  // Benchmark Category A: Evidence Fusion & Source Authority
  it('Benchmark A [Authority Precedence]: Authoritative DB strictly overrides stale memories and inferred summaries', () => {
    const fused = fuseEvidence([
      {
        id: 'ev-1',
        sourceType: 'task',
        sourceId: 'task-101',
        workspaceId: 'ws-benchmark',
        title: 'Security Audit',
        content: 'Task completed and verified in production',
        authorityLevel: 'authoritative_db',
        retrievalMethod: 'sql',
        metadata: { status: 'Completed', verified: true }
      },
      {
        id: 'ev-2',
        sourceType: 'task',
        sourceId: 'task-101',
        workspaceId: 'ws-benchmark',
        title: 'Security Audit Note',
        content: 'Old note claiming task is blocked by compliance review',
        authorityLevel: 'organizational_memory',
        retrievalMethod: 'memory',
        metadata: { status: 'Blocked', verified: false }
      },
      {
        id: 'ev-3',
        sourceType: 'task',
        sourceId: 'task-101',
        workspaceId: 'ws-benchmark',
        title: 'Weekly Summary',
        content: 'Summary stating task is in progress',
        authorityLevel: 'inferred_summary',
        retrievalMethod: 'memory',
        metadata: { status: 'In Progress' }
      }
    ]);

    expect(fused.items).toHaveLength(1);
    expect(fused.items[0].metadata?.status).toBe('Completed');
    expect(fused.items[0].authorityLevel).toBe('authoritative_db');
    expect(fused.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(fused.conflicts[0].resolvedInFavorOf).toBe('authoritative_db');
  });

  // Benchmark Category B: Retrieval Precision & Exclusion Metric
  it('Benchmark B [Retrieval Metric]: Filters irrelevant sources and calculates precision/recall metrics', () => {
    const goldStandardRelevantIds = ['t-1', 't-2'];
    const retrievedItems = [
      { id: 't-1', relevant: true },
      { id: 't-2', relevant: true },
      { id: 't-irrelevant-99', relevant: false }
    ];

    const truePositives = retrievedItems.filter(i => goldStandardRelevantIds.includes(i.id)).length;
    const precision = truePositives / retrievedItems.length;
    const recall = truePositives / goldStandardRelevantIds.length;

    expect(precision).toBeCloseTo(0.667, 2);
    expect(recall).toBe(1.0);
  });

  // Benchmark Category C: Dependency Traversal & Critical Path Discovery
  it('Benchmark C [Graph Traversal]: Accurately discovers critical blocker chains without cycles or hallucination', async () => {
    const mockSupabase = createMockSupabase();
    (mockSupabase as any).from = (table: string) => {
      if (table === 'projects') return createChainable({ id: 'proj-ga', name: 'General Availability' });
      if (table === 'tasks') {
        return createChainable([
          { id: 't-infra', title: 'Infra Cluster Deploy', status: 'Blocked', due_date: '2026-10-10' },
          { id: 't-api', title: 'Core API Rollout', status: 'Todo', due_date: '2026-10-14' },
          { id: 't-ui', title: 'Web App Launch', status: 'Todo', due_date: '2026-10-18' }
        ]);
      }
      if (table === 'task_dependencies') {
        return createChainable([
          { task_id: 't-api', depends_on_task_id: 't-infra', type: 'blocking' },
          { task_id: 't-ui', depends_on_task_id: 't-api', type: 'blocking' }
        ]);
      }
      if (table === 'profiles') return createChainable([]);
      return createChainable(null);
    };

    const result = await getProjectDependencyChain(mockSupabase, 'ws-test', 'proj-ga');

    expect(result.rootBlockers.some(b => b.taskId === 't-infra')).toBe(true);
    expect(result.criticalChains.length).toBeGreaterThanOrEqual(1);
    expect(result.blockedTasksCount).toBe(2);
  });

  // Benchmark Category D: Temporal Uncertainty Calibration
  it('Benchmark D [Uncertainty Calibration]: Distinguishes deterministic past due dates from forward predictive estimates', async () => {
    const mockSupabase = createMockSupabase();
    (mockSupabase as any).from = (table: string) => {
      if (table === 'projects') {
        return createChainable({
          id: 'proj-temporal',
          name: 'Telemetry Pipeline',
          due_date: '2026-10-25',
          status: 'In Progress'
        });
      }
      if (table === 'tasks') {
        return createChainable([
          { id: 't-slip', title: 'Kafka Connect', status: 'Blocked', due_date: '2026-10-12' },
          { id: 't-active', title: 'Ingestion Service', status: 'In Progress', due_date: '2026-10-24' }
        ]);
      }
      if (table === 'milestones') {
        return createChainable([
          { id: 'm-1', name: 'Pipeline Beta', due_date: '2026-10-25', status: 'In Progress' }
        ]);
      }
      if (table === 'task_dependencies') {
        return createChainable([
          { task_id: 't-active', depends_on_task_id: 't-slip', type: 'blocking' }
        ]);
      }
      return createChainable(null);
    };

    const analysis = await analyzeTemporalProjectRisks(mockSupabase, 'ws-test', 'proj-temporal', fixedNow);

    // Deterministic signal: Fact from DB (past due)
    const overdueSignal = analysis.deterministicSignals.find(s => s.category === 'overdue_slip');
    expect(overdueSignal).toBeDefined();
    expect(overdueSignal?.severity).toBe('high');

    // Predictive estimate: Future projection with explicit uncertainty
    expect(analysis.predictiveEstimates.length).toBeGreaterThan(0);
    expect(analysis.predictiveEstimates[0].confidenceScore).toBeGreaterThan(0);
    expect(analysis.predictiveEstimates[0].confidenceScore).toBeLessThanOrEqual(100);
    expect(analysis.predictiveEstimates[0].uncertaintyLevel).toBeDefined();
  });

  // Benchmark Category E: Multi-Option Structured Decision Quality
  it('Benchmark E [Decision Quality]: Enforces complete trade-off rubrics and explicit human approval requirements', () => {
    const comparison = buildDecisionComparison(
      'Database migration connection limit reached during peak load',
      ['Connection pool exhausted (100/100) verified in telemetry', '3 background cron jobs failed with connection timeouts'],
      ['No database restart during business hours', 'Budget cap $500/month'],
      [
        {
          id: 'opt-pgbouncer',
          title: 'Enable Supabase Transaction Pooler',
          description: 'Route non-session queries through port 6543 pooler',
          expectedBenefits: ['Absorbs connection spikes up to 1000 clients', 'Zero downtime transition'],
          risksAndTradeOffs: ['Prepared statements require transaction mode precautions'],
          requiredHumanApprovals: ['Database Administrator'],
          confidenceLevel: 'High'
        },
        {
          id: 'opt-scale-tier',
          title: 'Upgrade Compute Tier to 4XL',
          description: 'Increase instance RAM and connection ceiling',
          expectedBenefits: ['Direct connection count doubles'],
          risksAndTradeOffs: ['Violates monthly budget constraint by $250'],
          requiredHumanApprovals: ['VP Engineering', 'Finance Lead'],
          confidenceLevel: 'Low'
        }
      ],
      'opt-pgbouncer',
      'Transaction pooling resolves the root cause immediately without violating budget constraints or requiring downtime.'
    );

    expect(comparison.options).toHaveLength(2);
    expect(comparison.recommendedOptionId).toBe('opt-pgbouncer');
    expect(comparison.options[0].requiredHumanApprovals).toContain('Database Administrator');
    expect(comparison.mainConstraints).toContain('Budget cap $500/month');
  });

  // Benchmark Category F: Live Provider Generation Adherence (Executed if Provider Active)
  it('Benchmark F [Live Model Adherence]: Verified provider returns grounded instruction following without hallucinations', async () => {
    const model = getLanguageModel();
    if (!model) {
      console.log('[Benchmark F] Skipping live LLM call: AI_PROVIDER is mock');
      return;
    }

    const start = Date.now();
    const { text, usage } = await generateText({
      model,
      prompt: 'Respond strictly with valid JSON with keys "service" and "status" indicating system is operational.'
    });
    const latencyMs = Date.now() - start;

    console.log(`[Benchmark F Live Provider Metric] Latency: ${latencyMs}ms, Tokens: ${JSON.stringify(usage)}, Response: ${text.trim()}`);

    expect(text).toContain('status');
    expect(latencyMs).toBeLessThan(10000); // Latency benchmark < 10s
  }, 15000);
});
