import { describe, it, expect } from 'vitest';
import { generateSyntheticDataset } from '@/../scripts/performance/generate-workspace-data';

describe('Release 18 Phase 2: Synthetic Large-Workspace Dataset Verification', () => {
  const targetScales = [100, 1000, 5000, 10000, 20000];

  targetScales.forEach((scale) => {
    it(`generates and validates reproducible dataset of ${scale} tasks`, () => {
      const dataset = generateSyntheticDataset({ taskCount: scale, seed: 1337 });

      expect(dataset.tasks.length).toBe(scale);
      expect(dataset.projects.length).toBeGreaterThan(0);
      expect(dataset.members.length).toBeGreaterThan(0);
      expect(dataset.labels.length).toBeGreaterThan(0);

      // Verify foreign key integrity: every task references an existing project
      const projectIds = new Set(dataset.projects.map((p) => p.id));
      for (const task of dataset.tasks) {
        expect(projectIds.has(task.projectId)).toBe(true);
        expect(task.workspaceId).toBe(dataset.workspaceId);
      }

      // Verify subtask hierarchy integrity: every parentId points to an existing task in same workspace
      const taskIds = new Set(dataset.tasks.map((t) => t.id));
      for (const task of dataset.tasks) {
        if (task.parentId) {
          expect(taskIds.has(task.parentId)).toBe(true);
          expect(task.parentId).not.toBe(task.id);
        }
      }

      // Verify stats
      expect(dataset.stats.totalTasks).toBe(scale);
      console.log(
        `[Scale: ${scale}] Gen time: ${dataset.stats.generationDurationMs.toFixed(2)}ms | Subtasks: ${dataset.stats.subtaskCount} | Deps: ${dataset.stats.dependencyCount} | Attachments: ${dataset.stats.attachmentCount} | Watchers: ${dataset.stats.watcherCount}`
      );
    });
  });

  it('guarantees deterministic output when same seed is provided', () => {
    const run1 = generateSyntheticDataset({ taskCount: 500, seed: 999 });
    const run2 = generateSyntheticDataset({ taskCount: 500, seed: 999 });

    expect(run1.tasks[0].id).toBe(run2.tasks[0].id);
    expect(run1.tasks[0].title).toBe(run2.tasks[0].title);
    expect(run1.tasks[250].status).toBe(run2.tasks[250].status);
    expect(run1.stats.subtaskCount).toBe(run2.stats.subtaskCount);
  });
});

