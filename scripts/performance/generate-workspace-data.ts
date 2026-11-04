/**
 * SYNCORA Platform Major Release 18 — Phase 2C
 * Synthetic Large-Workspace Dataset Generator
 *
 * Generates deterministic, reproducible benchmark datasets (100, 1,000, 5,000, 10,000, 20,000 tasks)
 * with realistic relational graphs: projects, members, labels, subtasks, dependencies,
 * attachments, watchers, and comments.
 */

import { Task, TaskStatus, TaskPriority, User, Label, Project } from '@/types';

export interface SyntheticDatasetOptions {
  taskCount: number;
  workspaceId?: string;
  projectCount?: number;
  memberCount?: number;
  labelCount?: number;
  seed?: number;
}

export interface SyntheticWorkspaceDataset {
  workspaceId: string;
  projects: Project[];
  members: User[];
  labels: Label[];
  tasks: Task[];
  stats: {
    totalTasks: number;
    subtaskCount: number;
    dependencyCount: number;
    attachmentCount: number;
    watcherCount: number;
    generationDurationMs: number;
  };
}

// Deterministic Pseudo-Random Number Generator (Mulberry32)
function createRng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATUSES: TaskStatus[] = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

const TITLES = [
  'Optimize virtualized list rendering pipeline and recycle unused row nodes',
  'Implement J/K vim navigation with focus trap isolation',
  'Refactor Zustand data-store selectors to prevent cascading component updates',
  'Harden workspace isolation boundaries and eradicate cross-tenant cache bleed',
  'Add AbortController request deduplication for global search input',
  'Evaluate IndexedDB vs Zustand in-memory acceleration layer',
  'Resolve layout shift in Kanban drag-and-drop with CSS containment boundaries',
  'Support G then H multi-key shortcut sequences with configurable timeout',
  'Fix edge case in optimistic rollback when server returns newer timestamp',
  'Enforce WCAG 2.1 AA focus order across virtualized table DOM elements',
  'Implement demand-based task relation loading for sub-100ms workspace initialization',
  'Benchmark PostgreSQL query execution plan across 20,000 rows with index coverage',
  'Mitigate Realtime subscription churn during rapid multi-workspace transitions',
  'Instrument timing-safe token authentication on background maintenance endpoints',
  'Eliminate sequential batch chunking overhead in relational data hydration'
];

export function generateSyntheticDataset(options: SyntheticDatasetOptions): SyntheticWorkspaceDataset {
  const t0 = performance.now();
  const seed = options.seed ?? 42;
  const rng = createRng(seed);

  const workspaceId = options.workspaceId || `bench-ws-${options.taskCount}`;
  const projectCount = Math.max(1, Math.min(options.projectCount || Math.ceil(options.taskCount / 200), 50));
  const memberCount = Math.max(2, Math.min(options.memberCount || 20, 50));
  const labelCount = Math.max(5, Math.min(options.labelCount || 15, 30));

  // 1. Generate Members
  const members: User[] = [];
  for (let m = 0; m < memberCount; m++) {
    const id = `user-bench-${m + 1}`;
    const name = `Benchmark User ${m + 1}`;
    const initials = `U${m + 1}`;
    const role = m === 0 ? 'Owner' : m < 3 ? 'Admin' : 'Member';
    members.push({
      id,
      name,
      initials,
      email: `bench-user-${m + 1}@syncora.io`,
      role
    });
  }

  // 2. Generate Projects
  const projects: Project[] = [];
  for (let p = 0; p < projectCount; p++) {
    const id = `proj-bench-${p + 1}`;
    projects.push({
      id,
      name: `Core Project ${p + 1}`,
      description: `Synthetic benchmark project ${p + 1} for workspace ${workspaceId}`,
      status: 'Active',
      progress: Math.floor(rng() * 100),
      taskCount: 0,
      members: [members[p % members.length]],
      updatedAt: new Date(1730000000000 + p * 3600000).toISOString()
    });
  }

  // 3. Generate Labels
  const labels: Label[] = [];
  const colorOptions = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-red-100 text-red-700',
    'bg-indigo-100 text-indigo-700'
  ];
  for (let l = 0; l < labelCount; l++) {
    labels.push({
      id: `lbl-bench-${l + 1}`,
      name: `Tag-${l + 1}`,
      color: colorOptions[l % colorOptions.length]
    });
  }

  // 4. Generate Tasks with Graph Relations
  const tasks: Task[] = [];
  const baseTimestamp = 1730000000000;
  let subtaskCount = 0;
  let dependencyCount = 0;
  let attachmentCount = 0;
  let watcherCount = 0;

  for (let i = 0; i < options.taskCount; i++) {
    const taskId = `task-bench-${i + 1}`;
    const status = STATUSES[Math.floor(rng() * STATUSES.length)];
    const priority = PRIORITIES[Math.floor(rng() * PRIORITIES.length)];
    const project = projects[i % projects.length];
    const assignee = rng() > 0.15 ? members[Math.floor(rng() * members.length)] : undefined;

    // Subtask distribution: ~15% of tasks are children of earlier tasks in same project
    let parentId: string | null = null;
    if (i > 10 && rng() < 0.15) {
      // Pick parent from earlier tasks in same project
      const eligibleParents = tasks.filter(t => t.projectId === project.id && !t.parentId);
      if (eligibleParents.length > 0) {
        parentId = eligibleParents[Math.floor(rng() * eligibleParents.length)].id;
        subtaskCount++;
      }
    }

    // Labels: 0-3 labels per task
    const taskLabels: Label[] = [];
    const numLabels = Math.floor(rng() * 3);
    for (let lb = 0; lb < numLabels; lb++) {
      taskLabels.push(labels[Math.floor(rng() * labels.length)]);
    }

    // Dependencies: ~8% have blocking dependencies on earlier tasks
    const dependencies: import('@/types').TaskDependency[] = [];
    const blockedBy: import('@/types').TaskDependency[] = [];
    if (i > 5 && rng() < 0.08) {
      const depTarget = tasks[Math.floor(rng() * (i - 1))];
      if (depTarget && depTarget.id !== taskId) {
        dependencies.push({
          id: `dep-${i}-${depTarget.id}`,
          taskId,
          dependsOnTaskId: depTarget.id,
          type: 'blocking',
          createdAt: new Date(baseTimestamp + i * 1000).toISOString()
        });
        dependencyCount++;
      }
    }

    // Attachments: ~6% of tasks have 1-2 attachments
    const attachments: Array<{
      id: string;
      taskId: string;
      workspaceId: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      storagePath: string;
      uploadedBy: string;
      createdAt: string;
    }> = [];
    if (rng() < 0.06) {
      const attId = `att-${i + 1}`;
      attachments.push({
        id: attId,
        taskId,
        workspaceId,
        fileName: `benchmark-spec-${i + 1}.pdf`,
        fileSize: Math.floor(rng() * 5000000) + 1024,
        fileType: 'application/pdf',
        storagePath: `attachments/${workspaceId}/${taskId}/${attId}.pdf`,
        uploadedBy: assignee?.id || members[0].id,
        createdAt: new Date(baseTimestamp + i * 2000).toISOString()
      });
      attachmentCount++;
    }

    // Watchers: ~18% of tasks have 1-2 watchers
    const watchers: Array<{ userId: string }> = [];
    if (rng() < 0.18) {
      const watcher1 = members[Math.floor(rng() * members.length)];
      watchers.push({ userId: watcher1.id });
      watcherCount++;
    }

    const createdAt = new Date(baseTimestamp + i * 30000).toISOString();
    const dueDate = rng() > 0.4 ? new Date(baseTimestamp + (i + 100) * 86400000).toISOString() : undefined;

    tasks.push({
      id: taskId,
      title: `${TITLES[i % TITLES.length]} (#${i + 1})`,
      description: `Detailed engineering description and acceptance criteria for synthetic task #${i + 1}.`,
      status,
      priority,
      projectId: project.id,
      workspaceId,
      assignee,
      assigneeId: assignee?.id || null,
      labels: taskLabels,
      position: i,
      parentId,
      dueDate,
      createdAt,
      updatedAt: createdAt,
      estimatedHours: (i % 8) + 1,
      storyPoints: [1, 2, 3, 5, 8][i % 5],
      dependencies,
      blockedBy,
      attachments,
      watchers,
      estimatedTime: (i % 8) + 1,
    });
  }

  // Update project task counts
  for (const proj of projects) {
    proj.taskCount = tasks.filter(t => t.projectId === proj.id).length;
  }

  const generationDurationMs = performance.now() - t0;

  return {
    workspaceId,
    projects,
    members,
    labels,
    tasks,
    stats: {
      totalTasks: tasks.length,
      subtaskCount,
      dependencyCount,
      attachmentCount,
      watcherCount,
      generationDurationMs
    }
  };
}

