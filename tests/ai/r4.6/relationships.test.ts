import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProjectDependencyChain,
  getMilestoneBlockers,
  getWorkloadConcentration,
  getGoalAlignment
} from '../../../src/lib/ai/relationships';
import { createMockSupabase, createChainable } from '../mock-supabase';

describe('R4.6 Workspace Relationship Traversal', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('traces dependency chains and identifies root blockers', async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'projects') {
        return createChainable({ id: 'proj-1', name: 'Syncora Core' });
      }
      if (table === 'tasks') {
        return createChainable([
          { id: 'task-1', title: 'Database Migration', status: 'Blocked', priority: 'High', due_date: '2026-10-20', assignee_id: 'user-1' },
          { id: 'task-2', title: 'API Endpoints', status: 'Todo', priority: 'High', due_date: '2026-10-25', assignee_id: 'user-2' },
          { id: 'task-3', title: 'Frontend UI', status: 'Todo', priority: 'Medium', due_date: '2026-10-30', assignee_id: 'user-3' }
        ]);
      }
      if (table === 'task_dependencies') {
        return createChainable([
          // Task 2 depends on Task 1 (Task 1 blocks Task 2)
          { id: 'dep-1', task_id: 'task-2', depends_on_task_id: 'task-1', type: 'blocking' },
          // Task 3 depends on Task 2 (Task 2 blocks Task 3)
          { id: 'dep-2', task_id: 'task-3', depends_on_task_id: 'task-2', type: 'blocking' }
        ]);
      }
      if (table === 'profiles') {
        return createChainable([
          { id: 'user-1', full_name: 'Alice Dev' },
          { id: 'user-2', full_name: 'Bob Dev' },
          { id: 'user-3', full_name: 'Charlie Dev' }
        ]);
      }
      return createChainable(null);
    });

    const result = await getProjectDependencyChain(mockSupabase, 'ws-1', 'proj-1');

    expect(result.projectName).toBe('Syncora Core');
    expect(result.totalTasks).toBe(3);
    expect(result.blockedTasksCount).toBe(2); // task-2 and task-3 are blocked
    expect(result.rootBlockers.length).toBeGreaterThan(0);
    expect(result.rootBlockers[0].taskId).toBe('task-1'); // Root blocker is task-1
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it('retrieves active tasks contributing to milestone delays', async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'milestones') {
        return createChainable({
          id: 'ms-1',
          project_id: 'proj-1',
          name: 'Beta Release',
          due_date: '2026-10-25',
          status: 'In Progress'
        });
      }
      if (table === 'tasks') {
        return createChainable([
          { id: 'task-1', title: 'OAuth Provider Fix', status: 'In Progress', due_date: '2026-10-20', assignee_id: 'user-1' },
          { id: 'task-2', title: 'E2E Testing', status: 'Blocked', due_date: '2026-10-24', assignee_id: 'user-2' }
        ]);
      }
      if (table === 'profiles') {
        return createChainable([
          { id: 'user-1', full_name: 'Alice Dev' },
          { id: 'user-2', full_name: 'Bob Dev' }
        ]);
      }
      return createChainable(null);
    });

    const result = await getMilestoneBlockers(mockSupabase, 'ws-1', 'ms-1');

    expect(result.milestoneName).toBe('Beta Release');
    expect(result.blockingTasks).toHaveLength(2);
    expect(result.sources).toHaveLength(1);
  });

  it('evaluates workload concentration and identifies bottlenecked assignees', async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'tasks') {
        return createChainable([
          // user-1 has 6 tasks
          { id: 't1', assignee_id: 'user-1', estimated_hours: 8, status: 'In Progress', due_date: '2026-10-10' },
          { id: 't2', assignee_id: 'user-1', estimated_hours: 8, status: 'In Progress', due_date: '2026-10-11' },
          { id: 't3', assignee_id: 'user-1', estimated_hours: 8, status: 'Blocked', due_date: '2026-10-12' },
          { id: 't4', assignee_id: 'user-1', estimated_hours: 8, status: 'Todo', due_date: '2026-10-13' },
          { id: 't5', assignee_id: 'user-1', estimated_hours: 8, status: 'Todo', due_date: '2026-10-14' },
          { id: 't6', assignee_id: 'user-1', estimated_hours: 8, status: 'Todo', due_date: '2026-10-15' },
          // user-2 has 1 task
          { id: 't7', assignee_id: 'user-2', estimated_hours: 4, status: 'Todo', due_date: '2026-10-20' }
        ]);
      }
      if (table === 'profiles') {
        return createChainable([
          { id: 'user-1', full_name: 'Overloaded Lead' },
          { id: 'user-2', full_name: 'Junior Dev' }
        ]);
      }
      return createChainable(null);
    });

    const result = await getWorkloadConcentration(mockSupabase, 'ws-1');

    expect(result.totalActiveTasks).toBe(7);
    expect(result.concentrationRisk).toBe('High'); // >45% concentrated on user-1 (6/7 = 85%)
    expect(result.recommendation).toContain('Overloaded Lead');
    expect(result.members[0].isOverloaded).toBe(true);
  });

  it('aligns goals with active projects and progress metrics', async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'projects') {
        return createChainable([
          { id: 'p1', name: 'Web App', status: 'In Progress', priority: 'High', due_date: '2026-11-01', goal_id: 'g1' },
          { id: 'p2', name: 'Mobile App', status: 'Planning', priority: 'Medium', due_date: '2026-12-01', goal_id: 'g1' }
        ]);
      }
      if (table === 'goals') {
        return createChainable([
          { id: 'g1', name: 'Scale to 10k Users', status: 'On Track', progress: 65, target_date: '2026-12-31' }
        ]);
      }
      return createChainable(null);
    });

    const result = await getGoalAlignment(mockSupabase, 'ws-1');

    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].name).toBe('Scale to 10k Users');
    expect(result.goals[0].projects).toHaveLength(2);
  });
});
