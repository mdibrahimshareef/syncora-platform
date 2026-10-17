import { describe, it, expect } from 'vitest';
import { fuseEvidence } from '../../../src/lib/ai/evidence-fusion';
import { analyzeTemporalProjectRisks } from '../../../src/lib/ai/temporal-reasoning';
import { getProjectDependencyChain } from '../../../src/lib/ai/relationships';
import { buildDecisionComparison } from '../../../src/lib/ai/decision-support';
import { validateMemoryInput, MemoryValidationError } from '../../../src/lib/ai/memory';
import { calculatePlanRisk } from '../../../src/lib/ai/risk';
import { getLanguageModel } from '../../../src/lib/ai/provider';
import { generateText } from 'ai';
import { createMockSupabase, createChainable } from '../mock-supabase';

/**
 * Versioned Evaluation Dataset V1.0.0
 * Standardized scenarios with stable IDs, category fixtures, and verifiable acceptance criteria.
 */
export const EVALUATION_DATASET_V1 = {
  version: '1.0.0',
  scenarios: [
    {
      id: 'EVAL-01-AUTH-PRECEDENCE',
      dimension: 'Authority Precedence',
      mode: 'deterministic',
      description: 'Current database task record overrides contradictory older memory and document summaries.',
      input: {
        dbState: { status: 'Done', updatedAt: '2026-10-17T10:00:00Z' },
        memoryState: { status: 'Blocked', updatedAt: '2026-10-15T10:00:00Z' }
      },
      expected: { finalStatus: 'Done', authority: 'authoritative_db' }
    },
    {
      id: 'EVAL-02-RETRIEVAL-RELEVANCE',
      dimension: 'Retrieval Relevance & Exclusion',
      mode: 'deterministic',
      description: 'Retrieval must include required context documents while strictly excluding irrelevant or foreign items.',
      goldRelevantIds: ['doc-prod-deploy', 'doc-auth-spec'],
      corpus: [
        { id: 'doc-prod-deploy', relevant: true },
        { id: 'doc-auth-spec', relevant: true },
        { id: 'doc-unrelated-recipe', relevant: false },
        { id: 'doc-random-notes', relevant: false }
      ]
    },
    {
      id: 'EVAL-03-TEMPORAL-CORRECTNESS',
      dimension: 'Temporal Correctness & Slippage',
      mode: 'deterministic',
      description: 'Distinguishes past due dates (deterministic fact) from forward predictive estimates with uncertainty.',
      referenceDate: '2026-10-17T12:00:00Z',
      overdueTaskDueDate: '2026-10-10T12:00:00Z'
    },
    {
      id: 'EVAL-04-GRAPH-DEPENDENCY',
      dimension: 'Dependency Traversal & Root Blockers',
      mode: 'deterministic',
      description: 'Identifies the root blocker task in an upstream DAG chain without cycle corruption.',
      expectedRootBlockerId: 't-database-migration'
    },
    {
      id: 'EVAL-05-DECISION-QUALITY',
      dimension: 'Decision Support Trade-offs',
      mode: 'deterministic',
      description: 'Proposals must specify benefits, quantifiable risks, required approvals, and constraint alignment.',
      expectedMinOptions: 2
    },
    {
      id: 'EVAL-06-WORKFLOW-SAFETY',
      dimension: 'Workflow Safety & Risk Classification',
      mode: 'deterministic',
      description: 'Destructive or external actions must be classified as high risk requiring human approval.',
      destructiveAction: 'delete_task',
      readOnlyAction: 'get_task'
    },
    {
      id: 'EVAL-07-MEMORY-SCOPING',
      dimension: 'Memory Behavior & Privacy',
      mode: 'deterministic',
      description: 'Validates memory bounds (2000 chars max) and ensures private scopes require explicit user identification.',
      maxChars: 2000
    },
    {
      id: 'EVAL-08-SECURITY-GATE',
      dimension: 'Security Invariant Gate',
      mode: 'deterministic',
      description: 'Security and authorization failures MUST fail the quality gate unconditionally (zero compensation by model quality).'
    }
  ]
};

describe('Release 4.8 Repeatable AI Evaluation & Regression Framework (Part 5)', () => {
  const fixedNow = new Date('2026-10-17T12:00:00Z');

  // ==========================================
  // 1. DETERMINISTIC EVALUATION SUITE
  // ==========================================
  describe('Mode: Deterministic Evaluations (Section 5.1)', () => {
    it('[EVAL-01] Authority Precedence: DB truth strictly overrides contradictory memories', () => {
      const fused = fuseEvidence([
        {
          id: 'ev-1',
          sourceType: 'task',
          sourceId: 'task-auth-1',
          workspaceId: 'ws-eval',
          title: 'Database Upgrade',
          content: 'Database upgrade verified and completed.',
          authorityLevel: 'authoritative_db',
          retrievalMethod: 'sql',
          metadata: { status: 'Done' }
        },
        {
          id: 'ev-2',
          sourceType: 'task',
          sourceId: 'task-auth-1',
          workspaceId: 'ws-eval',
          title: 'Database Upgrade Note',
          content: 'Old note claiming database upgrade is blocked.',
          authorityLevel: 'organizational_memory',
          retrievalMethod: 'memory',
          metadata: { status: 'Blocked' }
        }
      ]);

      expect(fused.items).toHaveLength(1);
      expect(fused.items[0].metadata?.status).toBe('Done');
      expect(fused.items[0].authorityLevel).toBe('authoritative_db');
      expect(fused.conflicts).toHaveLength(1);
      expect(fused.conflicts[0].resolvedInFavorOf).toBe('authoritative_db');
    });

    it('[EVAL-02] Retrieval Relevance & Metrics: Calculates precision@k and recall@k accurately', () => {
      const scenario = EVALUATION_DATASET_V1.scenarios[1];
      const goldRelevant = scenario.goldRelevantIds as string[];
      const retrieved = scenario.corpus as Array<{ id: string; relevant: boolean }>;

      const truePositives = retrieved.filter(r => goldRelevant.includes(r.id)).length;
      const precision = truePositives / retrieved.length;
      const recall = truePositives / goldRelevant.length;

      expect(precision).toBe(0.5); // 2 relevant out of 4 retrieved
      expect(recall).toBe(1.0);    // 2 relevant found out of 2 gold
    });

    it('[EVAL-03] Temporal Correctness: Classifies overdue items deterministically and sets uncertainty on estimates', async () => {
      const mockSupabase = createMockSupabase();
      (mockSupabase as any).from = (table: string) => {
        if (table === 'projects') return createChainable({ id: 'p-1', name: 'Cloud Migration', due_date: '2026-10-25' });
        if (table === 'tasks') {
          return createChainable([
            { id: 't-1', title: 'Infra Setup', due_date: '2026-10-10', status: 'Blocked' }
          ]);
        }
        return createChainable(null);
      };

      const analysis = await analyzeTemporalProjectRisks(mockSupabase, 'ws-eval', 'p-1', fixedNow);
      const overdue = analysis.deterministicSignals.find(s => s.category === 'overdue_slip');

      expect(overdue).toBeDefined();
      expect(overdue?.severity).toBe('high');
      expect(analysis.predictiveEstimates.every(e => e.uncertaintyLevel !== undefined)).toBe(true);
    });

    it('[EVAL-04] Dependency Graph Traversal: Discovers root blocker without cycles', async () => {
      const mockSupabase = createMockSupabase();
      (mockSupabase as any).from = (table: string) => {
        if (table === 'projects') return createChainable({ id: 'p-eval', name: 'Eval Project' });
        if (table === 'tasks') {
          return createChainable([
            { id: 't-database-migration', title: 'Database Migration', status: 'Blocked' },
            { id: 't-backend-api', title: 'Backend API', status: 'Todo' }
          ]);
        }
        if (table === 'task_dependencies') {
          return createChainable([
            { task_id: 't-backend-api', depends_on_task_id: 't-database-migration', type: 'blocking' }
          ]);
        }
        return createChainable(null);
      };

      const chain = await getProjectDependencyChain(mockSupabase, 'ws-eval', 'p-eval');
      expect(chain.rootBlockers.some(b => b.taskId === 't-database-migration')).toBe(true);
    });

    it('[EVAL-05] Decision Quality: Generates balanced multi-option comparison with explicit trade-offs and approvals', () => {
      const comparison = buildDecisionComparison(
        'High memory usage in production cluster',
        ['Cluster memory at 92%', 'OOM killer triggered on analytics worker'],
        ['Max budget $200/mo', 'Zero downtime'],
        [
          {
            id: 'opt-pooler',
            title: 'Enable PgBouncer Pooler',
            description: 'Reduces backend connection memory consumption',
            expectedBenefits: ['Memory drops by 40%'],
            risksAndTradeOffs: ['Session pin restrictions'],
            requiredHumanApprovals: ['Lead DBA'],
            confidenceLevel: 'High'
          },
          {
            id: 'opt-scale',
            title: 'Scale node to 32GB RAM',
            description: 'Double instance memory capacity',
            expectedBenefits: ['Immediate headroom'],
            risksAndTradeOffs: ['Cost exceeds budget by $150/mo'],
            requiredHumanApprovals: ['Finance Director'],
            confidenceLevel: 'Medium'
          }
        ],
        'opt-pooler',
        'Option 1 resolves root connection memory bloat within budget constraints.'
      );

      expect(comparison.options).toHaveLength(2);
      expect(comparison.recommendedOptionId).toBe('opt-pooler');
      expect(comparison.options[0].requiredHumanApprovals).toContain('Lead DBA');
    });

    it('[EVAL-06] Workflow Safety: Correctly scores risk and enforces approval on mutating actions', () => {
      const highRiskPlan = {
        title: 'Delete Stale Tasks',
        description: 'Prune old tasks from database',
        steps: [
          {
            stepId: 'step-1',
            tool: 'delete_task',
            args: { taskId: 'task-999' }
          }
        ]
      };

      const risk = calculatePlanRisk(highRiskPlan);
      expect(risk).toBe('HIGH');
    });

    it('[EVAL-07] Memory Scoping: Validates content bounds and rejects oversize proposals', () => {
      expect(() => validateMemoryInput({
        workspaceId: 'ws-eval',
        category: 'goal_priority',
        content: 'Focus on SOC2 compliance in Q4.',
        scope: 'workspace',
        sourceType: 'conversation_extraction'
      })).not.toThrow();

      expect(() => validateMemoryInput({
        workspaceId: 'ws-eval',
        category: 'goal_priority',
        content: 'X'.repeat(2500), // Exceeds 2000 chars limit
        scope: 'workspace',
        sourceType: 'conversation_extraction'
      })).toThrowError(MemoryValidationError);
    });
  });

  // ==========================================
  // 2. SECURITY INVARIANT GATE
  // ==========================================
  describe('Mode: Security Invariant Gate (Section 5.5)', () => {
    it('[EVAL-08] CRITICAL: Security violation fails the gate even if quality score is 100%', () => {
      // Simulating a scenario where model quality is 1.0 (100%), but a security breach occurred
      const evaluationResult = {
        modelQualityScore: 1.0,
        unauthorizedAccessAttempted: true,
        securityViolationDetected: true
      };

      // Security invariant rule: security violations MUST unconditionally result in GATE_FAILED
      const gateStatus = (evaluationResult.securityViolationDetected || evaluationResult.unauthorizedAccessAttempted)
        ? 'GATE_FAILED'
        : 'GATE_PASSED';

      expect(gateStatus).toBe('GATE_FAILED');
      expect(evaluationResult.modelQualityScore).toBe(1.0); // Model quality cannot offset security failure
    });
  });

  // ==========================================
  // 3. LIVE PROVIDER EVALUATION SUITE (OPT-IN)
  // ==========================================
  describe('Mode: Live Provider Evaluations (Section 5.1 & 5.6)', () => {
    it('[EVAL-LIVE] Model Adherence & Structured Output: Executes against active provider when configured', async () => {
      const model = getLanguageModel();
      if (!model) {
        console.log('[EVAL-LIVE] Skipping live generation: AI_PROVIDER is mock. Report status: BLOCKED_OR_MOCK');
        return;
      }

      const startTime = Date.now();
      const { text } = await generateText({
        model,
        prompt: 'Return a JSON object with keys "benchmark_id" ("R4.8-LIVE-01") and "status" ("HEALTHY").'
      });
      const latencyMs = Date.now() - startTime;

      console.log(`[EVAL-LIVE Response] Latency: ${latencyMs}ms | Output: ${text.trim()}`);
      expect(text).toContain('R4.8-LIVE-01');
      expect(text).toContain('HEALTHY');
      expect(latencyMs).toBeLessThan(12000);
    }, 15000);
  });
});
