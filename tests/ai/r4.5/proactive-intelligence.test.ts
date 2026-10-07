import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runProactiveAnalysis } from '../../../src/lib/ai/proactive-intelligence';
import { createMockSupabase, createChainable } from '../mock-supabase';

describe('R4.5 Proactive Work Intelligence', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    
    // Setup specific mock chains for testing proactive intelligence
    const tasksChain = createChainable([
      { id: 'task-1', title: 'Overdue Task 1', assignee_id: 'user-1' }
    ]);
    const projectsChain = createChainable([
      { id: 'proj-1', name: 'Stalled Project 1' }
    ]);
    const insightsCheckChain = createChainable(null); // No existing insights
    
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'tasks') return tasksChain;
      if (table === 'projects') return projectsChain;
      if (table === 'ai_insights') return insightsCheckChain; // For both select (check) and insert
      if (table === 'notifications') return createChainable(null);
      return createChainable(null);
    });
  });

  it('generates NEEDS_ATTENTION insights for overdue tasks', async () => {
    const job = { id: 'job-1', workspace_id: 'ws-1', user_id: 'user-1' } as any;
    
    await runProactiveAnalysis(mockSupabase, job);
    
    // Verify insights insertion
    expect(mockSupabase.from).toHaveBeenCalledWith('ai_insights');
    
    // Check notifications insertion
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
  });

  it('skips generating insights if they already exist and are not dismissed', async () => {
    // Override the insights check chain to return an existing insight
    const insightsCheckChain = createChainable({ id: 'insight-1' });
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'tasks') return createChainable([{ id: 'task-1' }]);
      if (table === 'projects') return createChainable([]);
      if (table === 'ai_insights') return insightsCheckChain;
      return createChainable(null);
    });

    const job = { id: 'job-1', workspace_id: 'ws-1', user_id: 'user-1' } as any;
    await runProactiveAnalysis(mockSupabase, job);
    
    // Should NOT insert any new insights, meaning insightsCheckChain.insert is not called
    expect(insightsCheckChain.insert).not.toHaveBeenCalled();
  });
});
