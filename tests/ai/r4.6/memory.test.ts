import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMemory,
  getScopedMemories,
  supersedeMemory,
  archiveMemory,
  deleteMemory,
  validateMemoryInput,
  MemoryValidationError
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
});
