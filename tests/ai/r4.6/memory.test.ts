import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMemory,
  getScopedMemories,
  supersedeMemory,
  archiveMemory,
  deleteMemory,
  validateMemoryInput,
  MemoryValidationError,
  scoreMemoryRelevance,
  rankAndFilterMemories
} from '../../../src/lib/ai/memory';
import { createMockSupabase, createChainable } from '../mock-supabase';

describe('R4.6 Organizational Memory & Scoping', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase({
      'ai_memories': () => createChainable({
        id: 'mem-1',
        workspace_id: 'ws-1',
        scope: 'workspace',
        category: 'working_agreement',
        content: 'All API PRs require schema verification before merge.',
        lifecycle_status: 'active',
        confidence: 90
      })
    });
  });

  describe('Validation & Guards', () => {
    it('validates required fields', () => {
      expect(() => validateMemoryInput({
        workspaceId: '',
        scope: 'workspace',
        category: 'goal_priority',
        content: 'Valid content',
        sourceType: 'explicit_user'
      })).toThrow(MemoryValidationError);

      expect(() => validateMemoryInput({
        workspaceId: 'ws-1',
        scope: 'workspace',
        category: 'goal_priority',
        content: '',
        sourceType: 'explicit_user'
      })).toThrow(MemoryValidationError);
    });

    it('requires userId for user-scoped memories', () => {
      expect(() => validateMemoryInput({
        workspaceId: 'ws-1',
        scope: 'user',
        userId: undefined,
        category: 'user_preference',
        content: 'I prefer dark mode and concise summaries.',
        sourceType: 'explicit_user'
      })).toThrow('userId is required for user-scoped memory');
    });

    it('rejects expired memory creation', () => {
      expect(() => validateMemoryInput({
        workspaceId: 'ws-1',
        scope: 'workspace',
        category: 'goal_priority',
        content: 'Old temporary goal',
        sourceType: 'explicit_user',
        expiresAt: new Date(Date.now() - 10000).toISOString() // in past
      })).toThrow('expiresAt must be in the future');
    });
  });

  describe('Lifecycle & Operations', () => {
    it('creates workspace-scoped memory', async () => {
      const memory = await createMemory(mockSupabase, {
        workspaceId: 'ws-1',
        scope: 'workspace',
        category: 'working_agreement',
        content: 'All API PRs require schema verification before merge.',
        sourceType: 'explicit_user',
        confidence: 95
      }, 'user-admin');

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_memories');
      expect(memory.id).toBe('mem-1');
      expect(memory.scope).toBe('workspace');
    });

    it('handles deduplication by updating review timestamp on exact duplicate', async () => {
      // Mock existing duplicate
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'ai_memories') {
          return createChainable({
            id: 'mem-existing-1',
            confidence: 80,
            last_reviewed_at: '2026-01-01'
          });
        }
        return createChainable(null);
      });

      const res = await createMemory(mockSupabase, {
        workspaceId: 'ws-1',
        scope: 'workspace',
        category: 'working_agreement',
        content: 'Existing rule',
        sourceType: 'explicit_user',
        confidence: 90
      });

      expect(res.id).toBe('mem-existing-1');
    });

    it('supersedes an outdated memory and preserves audit link', async () => {
      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // fetch old
          return createChainable({ id: 'mem-old', workspace_id: 'ws-1', content: 'Old release target: Q3' });
        }
        if (callCount === 2) {
          // duplicate check
          return createChainable(null);
        }
        if (callCount === 3) {
          // insert new
          return createChainable({ id: 'mem-new', workspace_id: 'ws-1', content: 'Updated release target: Q4' });
        }
        // update old status to superseded
        return createChainable({ id: 'mem-old', lifecycle_status: 'superseded', superseded_by: 'mem-new' });
      });

      const { old, new: replacement } = await supersedeMemory(
        mockSupabase,
        'ws-1',
        'mem-old',
        {
          workspaceId: 'ws-1',
          scope: 'workspace',
          category: 'project_objective',
          content: 'Updated release target: Q4',
          sourceType: 'decision_record'
        },
        'user-1'
      );

      expect(replacement.id).toBe('mem-new');
      expect(old.lifecycle_status).toBe('superseded');
    });

    it('archives memory cleanly', async () => {
      const ok = await archiveMemory(mockSupabase, 'ws-1', 'mem-1');
      expect(ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('ai_memories');
    });

    it('deletes memory cleanly', async () => {
      const ok = await deleteMemory(mockSupabase, 'ws-1', 'mem-1');
      expect(ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('ai_memories');
    });
  });

  describe('Scoped Retrieval & Privacy Isolation', () => {
    it('retrieves shared memories and user memories when userId provided', async () => {
      mockSupabase.from = vi.fn(() => {
        return createChainable([
          { id: 'mem-ws-1', scope: 'workspace', content: 'Team agreement' },
          { id: 'mem-user-1', scope: 'user', content: 'My personal preference' }
        ]);
      });

      const memories = await getScopedMemories(mockSupabase, 'ws-1', {
        userId: 'user-1'
      });

      expect(memories.length).toBeGreaterThan(0);
    });

    it('strictly isolates private user memories when scope is requested', async () => {
      mockSupabase.from = vi.fn(() => createChainable([]));

      // Requesting user-scoped memory without userId returns empty array safely
      const memories = await getScopedMemories(mockSupabase, 'ws-1', {
        scope: 'user',
        userId: undefined
      });

      expect(memories).toHaveLength(0);
    });
  });

  describe('R4.9 Memory Relevance & Freshness Scoring', () => {
    const fixedNow = new Date('2026-10-17T12:00:00Z');

    const freshRelevantMemory = {
      id: 'mem-api-fresh',
      workspace_id: 'ws-1',
      scope: 'workspace' as const,
      category: 'working_agreement' as const,
      content: 'API endpoints must use validation schemas and rate limiters.',
      confidence: 95,
      verification_status: 'confirmed' as const,
      lifecycle_status: 'active' as const,
      updated_at: '2026-10-15T12:00:00Z', // 2 days old
      attributes: {},
      evidence: [],
      source_type: 'explicit_user' as const,
      created_at: '2026-10-15T12:00:00Z',
      provenance: {}
    };

    const staleRelevantMemory = {
      ...freshRelevantMemory,
      id: 'mem-api-stale',
      updated_at: '2026-06-01T12:00:00Z' // ~138 days old
    };

    const irrelevantMemory = {
      id: 'mem-lunch',
      workspace_id: 'ws-1',
      scope: 'workspace' as const,
      category: 'operational_pattern' as const,
      content: 'Catering delivery arrives at noon on Fridays.',
      confidence: 80,
      verification_status: 'unverified' as const,
      lifecycle_status: 'active' as const,
      updated_at: '2026-10-16T12:00:00Z',
      attributes: {},
      evidence: [],
      source_type: 'system_observation' as const,
      created_at: '2026-10-16T12:00:00Z',
      provenance: {}
    };

    const supersededMemory = {
      ...freshRelevantMemory,
      id: 'mem-superseded',
      lifecycle_status: 'superseded' as const,
      superseded_by: 'mem-api-fresh'
    };

    it('scores relevant fresh memory significantly higher than stale or irrelevant memory', () => {
      const scoreFresh = scoreMemoryRelevance(freshRelevantMemory, 'How do we design API endpoints and schemas?', fixedNow);
      const scoreStale = scoreMemoryRelevance(staleRelevantMemory, 'How do we design API endpoints and schemas?', fixedNow);
      const scoreIrrelevant = scoreMemoryRelevance(irrelevantMemory, 'How do we design API endpoints and schemas?', fixedNow);

      expect(scoreFresh.isEligible).toBe(true);
      expect(scoreFresh.totalScore).toBeGreaterThan(scoreStale.totalScore);
      expect(scoreFresh.totalScore).toBeGreaterThan(scoreIrrelevant.totalScore);
      expect(scoreFresh.components.freshnessScore).toBeGreaterThan(scoreStale.components.freshnessScore);
    });

    it('strictly excludes superseded and expired memories from ranking', () => {
      const scoreSuperseded = scoreMemoryRelevance(supersededMemory, 'API', fixedNow);
      expect(scoreSuperseded.isEligible).toBe(false);
      expect(scoreSuperseded.totalScore).toBe(0);
      expect(scoreSuperseded.exclusionReason).toBe('superseded_or_inactive');

      const expiredMemory = {
        ...freshRelevantMemory,
        id: 'mem-expired',
        expires_at: '2026-10-01T00:00:00Z'
      };
      const scoreExpired = scoreMemoryRelevance(expiredMemory, 'API', fixedNow);
      expect(scoreExpired.isEligible).toBe(false);
      expect(scoreExpired.totalScore).toBe(0);
      expect(scoreExpired.exclusionReason).toBe('expired');
    });

    it('ranks and filters candidate memories by relevance score threshold', () => {
      const candidates = [staleRelevantMemory, irrelevantMemory, freshRelevantMemory, supersededMemory];
      const ranked = rankAndFilterMemories(candidates, 'API schemas and rate limiters', {
        limit: 2,
        minScoreThreshold: 0.3,
        referenceDate: fixedNow
      });

      expect(ranked).toHaveLength(2);
      expect(ranked[0].id).toBe('mem-api-fresh');
      expect(ranked[1].id).toBe('mem-api-stale');
      // Superseded is excluded; irrelevant is below threshold or lower ranked
      expect(ranked.some(m => m.id === 'mem-superseded')).toBe(false);
    });
  });
});
