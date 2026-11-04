import { describe, it, expect } from 'vitest';
import { generateSyntheticDataset } from '@/../scripts/performance/generate-workspace-data';
import { useDataStore } from '@/stores/data-store';
import { Task } from '@/types';

// Helper to compute statistical percentiles from array of measurements
export function computeStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return { min, median: p50, p90, p95, p99, max, avg, samples: sorted.length };
}

describe('Release 18 Phase 2B: Application & Memory Baseline Benchmarks', () => {
  const scales = [100, 1000, 5000, 10000, 20000];
  const ITERATIONS = 15;

  scales.forEach((scale) => {
    describe(`Scale: ${scale} tasks`, () => {
      let tasks: Task[];

      it(`allocates and initializes ${scale} synthetic tasks`, () => {
        const durations: number[] = [];
        for (let iter = 0; iter < 5; iter++) {
          const t0 = performance.now();
          const dataset = generateSyntheticDataset({ taskCount: scale, seed: 100 + iter });
          durations.push(performance.now() - t0);
          if (iter === 0) tasks = dataset.tasks;
        }

        const stats = computeStats(durations);
        expect(tasks.length).toBe(scale);
        console.log(
          `[BASELINE ${scale} tasks] Init/Alloc -> min: ${stats.min.toFixed(2)}ms | p50: ${stats.median.toFixed(2)}ms | p95: ${stats.p95.toFixed(2)}ms | max: ${stats.max.toFixed(2)}ms`
        );
      });

      it(`measures multi-field filter performance (Status + Priority)`, () => {
        const durations: number[] = [];
        let matchCount = 0;

        for (let iter = 0; iter < ITERATIONS; iter++) {
          const t0 = performance.now();
          const filtered = tasks.filter((t) => t.status === 'In Progress' && t.priority === 'High');
          durations.push(performance.now() - t0);
          matchCount = filtered.length;
        }

        const stats = computeStats(durations);
        expect(matchCount).toBeGreaterThan(0);
        console.log(
          `[BASELINE ${scale} tasks] Filter -> matches: ${matchCount} | min: ${stats.min.toFixed(3)}ms | p50: ${stats.median.toFixed(3)}ms | p95: ${stats.p95.toFixed(3)}ms | max: ${stats.max.toFixed(3)}ms`
        );
      });

      it(`measures text search performance across title & description`, () => {
        const durations: number[] = [];
        const term = 'virtualized';
        let matchCount = 0;

        for (let iter = 0; iter < ITERATIONS; iter++) {
          const t0 = performance.now();
          const termLower = term.toLowerCase();
          const searched = tasks.filter(
            (t) => t.title.toLowerCase().includes(termLower) || t.description?.toLowerCase().includes(termLower)
          );
          durations.push(performance.now() - t0);
          matchCount = searched.length;
        }

        const stats = computeStats(durations);
        expect(matchCount).toBeGreaterThan(0);
        console.log(
          `[BASELINE ${scale} tasks] Search -> matches: ${matchCount} | min: ${stats.min.toFixed(3)}ms | p50: ${stats.median.toFixed(3)}ms | p95: ${stats.p95.toFixed(3)}ms | max: ${stats.max.toFixed(3)}ms`
        );
      });

      it(`measures multi-column sorting performance (DueDate desc, Position asc)`, () => {
        const durations: number[] = [];

        for (let iter = 0; iter < ITERATIONS; iter++) {
          const t0 = performance.now();
          const sorted = [...tasks].sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA;
            return a.position - b.position;
          });
          durations.push(performance.now() - t0);
          expect(sorted.length).toBe(scale);
        }

        const stats = computeStats(durations);
        console.log(
          `[BASELINE ${scale} tasks] Sort -> min: ${stats.min.toFixed(3)}ms | p50: ${stats.median.toFixed(3)}ms | p95: ${stats.p95.toFixed(3)}ms | max: ${stats.max.toFixed(3)}ms`
        );
      });

      it(`measures workspace switching state flush latency`, () => {
        const durations: number[] = [];

        for (let iter = 0; iter < 5; iter++) {
          useDataStore.setState({
            activeWorkspaceId: `ws-${scale}-${iter}`,
            tasks,
            workspaceTasks: tasks,
          });

          const t0 = performance.now();
          useDataStore.getState().setActiveWorkspaceId(`ws-${scale}-target-${iter}`);
          durations.push(performance.now() - t0);

          expect(useDataStore.getState().tasks.length).toBe(0);
          expect(useDataStore.getState().workspaceTasks.length).toBe(0);
        }

        const stats = computeStats(durations);
        console.log(
          `[BASELINE ${scale} tasks] Workspace Switch Reset -> min: ${stats.min.toFixed(3)}ms | p50: ${stats.median.toFixed(3)}ms | max: ${stats.max.toFixed(3)}ms`
        );
      });
    });
  });
});

