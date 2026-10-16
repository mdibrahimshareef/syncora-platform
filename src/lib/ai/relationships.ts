import { SupabaseClient } from '@supabase/supabase-js';
import { AISource, resolveSourceUrl } from './sources';

export interface DependencyChainItem {
  taskId: string;
  taskTitle: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string;
  } | null;
  blockedBy: Array<{
    dependsOnTaskId: string;
    dependsOnTitle: string;
    dependsOnStatus: string;
    dependsOnDueDate: string | null;
    dependsOnAssigneeName: string | null;
  }>;
}

export interface DependencyChainResult {
  projectId: string;
  projectName: string;
  totalTasks: number;
  blockedTasksCount: number;
  criticalChains: DependencyChainItem[];
  rootBlockers: Array<{
    taskId: string;
    title: string;
    status: string;
    dueDate: string | null;
    assigneeName: string | null;
    dependentTasksCount: number;
  }>;
  sources: AISource[];
}

export interface MilestoneBlockersResult {
  milestoneId: string;
  milestoneName: string;
  dueDate: string | null;
  status: string;
  blockingTasks: Array<{
    taskId: string;
    title: string;
    status: string;
    dueDate: string | null;
    assigneeName: string | null;
    isOverdue: boolean;
  }>;
  sources: AISource[];
}

export interface WorkloadConcentrationResult {
  totalActiveTasks: number;
  totalEstimatedHours: number;
  members: Array<{
    userId: string;
    fullName: string;
    activeTasksCount: number;
    overdueTasksCount: number;
    blockedTasksCount: number;
    estimatedHours: number;
    isOverloaded: boolean;
  }>;
  concentrationRisk: 'Low' | 'Medium' | 'High';
  recommendation?: string;
  sources: AISource[];
}

export interface GoalAlignmentResult {
  goals: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    targetDate: string | null;
    projects: Array<{
      id: string;
      name: string;
      status: string;
      priority: string;
      dueDate: string | null;
    }>;
  }>;
  sources: AISource[];
}

/**
 * Traces task dependencies and root blockers within a project.
 * Uses bounded SQL queries in existing PostgreSQL.
 */
export async function getProjectDependencyChain(
  supabase: SupabaseClient,
  workspaceId: string,
  projectId: string
): Promise<DependencyChainResult> {
  // 1. Fetch project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!project) {
    throw new Error(`Project ${projectId} not found in workspace ${workspaceId}`);
  }

  // 2. Fetch tasks for this project
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, assignee_id')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)
    .limit(100);

  const taskList = tasks || [];
  const taskMap = new Map<string, typeof taskList[0]>();
  taskList.forEach(t => taskMap.set(t.id, t));

  // 3. Fetch dependencies for these tasks
  const taskIds = taskList.map(t => t.id);
  let dependencies: any[] = [];
  if (taskIds.length > 0) {
    const { data: deps } = await supabase
      .from('task_dependencies')
      .select('id, task_id, depends_on_task_id, type')
      .in('task_id', taskIds)
      .eq('type', 'blocking');
    dependencies = deps || [];
  }

  // 4. Fetch assignee names
  const assigneeIds = Array.from(new Set(taskList.map(t => t.assignee_id).filter(Boolean)));
  const profileMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', assigneeIds);
    (profiles || []).forEach(p => profileMap.set(p.id, p.full_name || 'Unnamed'));
  }

  // 5. Build relationship graph
  const dependentCountMap = new Map<string, number>();
  const criticalChains: DependencyChainItem[] = [];

  for (const t of taskList) {
    const taskDeps = dependencies.filter(d => d.task_id === t.id);
    if (taskDeps.length > 0) {
      const blockedBy = taskDeps.map(d => {
        const depTask = taskMap.get(d.depends_on_task_id);
        const depAssigneeName = depTask?.assignee_id ? profileMap.get(depTask.assignee_id) || 'Unassigned' : 'Unassigned';
        
        dependentCountMap.set(
          d.depends_on_task_id,
          (dependentCountMap.get(d.depends_on_task_id) || 0) + 1
        );

        return {
          dependsOnTaskId: d.depends_on_task_id,
          dependsOnTitle: depTask?.title || 'Unknown Task',
          dependsOnStatus: depTask?.status || 'Unknown',
          dependsOnDueDate: depTask?.due_date || null,
          dependsOnAssigneeName: depAssigneeName
        };
      });

      criticalChains.push({
        taskId: t.id,
        taskTitle: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
        assignee: t.assignee_id ? {
          id: t.assignee_id,
          name: profileMap.get(t.assignee_id) || 'Unnamed'
        } : null,
        blockedBy
      });
    }
  }

  // 6. Find root blockers: tasks that block other tasks and are not completed
  const rootBlockers = Array.from(dependentCountMap.entries())
    .map(([taskId, count]) => {
      const task = taskMap.get(taskId);
      if (!task || task.status === 'Done' || task.status === 'Completed') return null;
      return {
        taskId,
        title: task.title,
        status: task.status,
        dueDate: task.due_date,
        assigneeName: task.assignee_id ? profileMap.get(task.assignee_id) || 'Unassigned' : 'Unassigned',
        dependentTasksCount: count
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .sort((a, b) => b.dependentTasksCount - a.dependentTasksCount);

  // 7. Sources
  const projectUrl = await resolveSourceUrl(workspaceId, 'project', projectId);
  const sources: AISource[] = [{
    id: `dep-chain-${projectId}`,
    entityId: projectId,
    type: 'project',
    title: `Dependency Graph: ${project.name}`,
    description: `${criticalChains.length} tasks blocked across ${rootBlockers.length} root blockers`,
    workspaceId,
    sourceKind: 'analysis',
    url: projectUrl
  }];

  return {
    projectId,
    projectName: project.name,
    totalTasks: taskList.length,
    blockedTasksCount: criticalChains.length,
    criticalChains,
    rootBlockers,
    sources
  };
}

/**
 * Retrieves tasks blocking a specific milestone.
 */
export async function getMilestoneBlockers(
  supabase: SupabaseClient,
  workspaceId: string,
  milestoneId: string
): Promise<MilestoneBlockersResult> {
  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, project_id, name, due_date, status')
    .eq('id', milestoneId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!milestone) {
    throw new Error(`Milestone ${milestoneId} not found in workspace ${workspaceId}`);
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, assignee_id')
    .eq('project_id', milestone.project_id)
    .eq('workspace_id', workspaceId)
    .neq('status', 'Done')
    .neq('status', 'Completed')
    .limit(50);

  const taskList = tasks || [];
  const assigneeIds = Array.from(new Set(taskList.map(t => t.assignee_id).filter(Boolean)));
  const profileMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', assigneeIds);
    (profiles || []).forEach(p => profileMap.set(p.id, p.full_name || 'Unnamed'));
  }

  const nowTime = Date.now();
  const blockingTasks = taskList.map(t => ({
    taskId: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.due_date,
    assigneeName: t.assignee_id ? profileMap.get(t.assignee_id) || 'Unassigned' : 'Unassigned',
    isOverdue: Boolean(t.due_date && new Date(t.due_date).getTime() < nowTime)
  }));

  const projectUrl = await resolveSourceUrl(workspaceId, 'project', milestone.project_id);
  const sources: AISource[] = [{
    id: `milestone-${milestoneId}`,
    entityId: milestoneId,
    type: 'milestone',
    title: `Milestone: ${milestone.name}`,
    description: `Target: ${milestone.due_date || 'No date'}. ${blockingTasks.length} active tasks contributing.`,
    workspaceId,
    sourceKind: 'tool',
    url: projectUrl
  }];

  return {
    milestoneId,
    milestoneName: milestone.name,
    dueDate: milestone.due_date,
    status: milestone.status || 'Active',
    blockingTasks,
    sources
  };
}

/**
 * Calculates workload concentration across workspace members.
 */
export async function getWorkloadConcentration(
  supabase: SupabaseClient,
  workspaceId: string,
  projectId?: string
): Promise<WorkloadConcentrationResult> {
  let query = supabase
    .from('tasks')
    .select('id, status, due_date, assignee_id, estimated_hours')
    .eq('workspace_id', workspaceId)
    .neq('status', 'Done')
    .neq('status', 'Completed');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: tasks } = await query.limit(200);
  const taskList = tasks || [];

  const nowTime = Date.now();
  const memberStats = new Map<string, {
    active: number;
    overdue: number;
    blocked: number;
    hours: number;
  }>();

  let totalHours = 0;

  for (const t of taskList) {
    if (!t.assignee_id) continue;
    const stats = memberStats.get(t.assignee_id) || { active: 0, overdue: 0, blocked: 0, hours: 0 };
    stats.active += 1;
    const estHours = Number(t.estimated_hours) || 0;
    stats.hours += estHours;
    totalHours += estHours;

    if (t.status === 'Blocked') {
      stats.blocked += 1;
    }
    if (t.due_date && new Date(t.due_date).getTime() < nowTime) {
      stats.overdue += 1;
    }
    memberStats.set(t.assignee_id, stats);
  }

  // Fetch profiles
  const userIds = Array.from(memberStats.keys());
  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    (profiles || []).forEach(p => profileMap.set(p.id, p.full_name || 'Unnamed'));
  }

  const members = userIds.map(uid => {
    const s = memberStats.get(uid)!;
    // Overloaded if > 10 active tasks, or > 40 hours, or > 3 overdue tasks
    const isOverloaded = s.active >= 8 || s.hours >= 40 || s.overdue >= 3;
    return {
      userId: uid,
      fullName: profileMap.get(uid) || 'Team Member',
      activeTasksCount: s.active,
      overdueTasksCount: s.overdue,
      blockedTasksCount: s.blocked,
      estimatedHours: s.hours,
      isOverloaded
    };
  }).sort((a, b) => b.activeTasksCount - a.activeTasksCount);

  // Evaluate concentration
  const maxTasksOnSinglePerson = members.length > 0 ? members[0].activeTasksCount : 0;
  const ratio = taskList.length > 0 ? maxTasksOnSinglePerson / taskList.length : 0;

  let concentrationRisk: 'Low' | 'Medium' | 'High' = 'Low';
  let recommendation: string | undefined;

  if (ratio > 0.45 && members.length > 1) {
    concentrationRisk = 'High';
    recommendation = `Workload is heavily bottlenecked on ${members[0].fullName} who holds ${Math.round(ratio * 100)}% of active tasks. Reassignment is strongly advised.`;
  } else if (ratio > 0.3 && members.length > 2) {
    concentrationRisk = 'Medium';
    recommendation = `Workload is moderately concentrated on ${members[0].fullName}.`;
  }

  const sources: AISource[] = [{
    id: `workload-concentration-${workspaceId}`,
    entityId: workspaceId,
    type: 'workspace',
    title: 'Workload Concentration Analysis',
    description: `${members.length} assignees tracked, ${taskList.length} active tasks`,
    workspaceId,
    sourceKind: 'analysis'
  }];

  return {
    totalActiveTasks: taskList.length,
    totalEstimatedHours: totalHours,
    members,
    concentrationRisk,
    recommendation,
    sources
  };
}

/**
 * Fetches workspace goals and aligned projects.
 */
export async function getGoalAlignment(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<GoalAlignmentResult> {
  // Goals are associated with org or linked directly via projects.goal_id
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, priority, due_date, goal_id')
    .eq('workspace_id', workspaceId)
    .not('goal_id', 'is', null);

  const projectList = projects || [];
  const goalIds = Array.from(new Set(projectList.map(p => p.goal_id).filter(Boolean)));

  let goals: any[] = [];
  if (goalIds.length > 0) {
    const { data: fetchedGoals } = await supabase
      .from('goals')
      .select('id, name, status, progress, target_date')
      .in('id', goalIds);
    goals = fetchedGoals || [];
  }

  const alignedGoals = goals.map(g => ({
    id: g.id,
    name: g.name,
    status: g.status,
    progress: g.progress || 0,
    targetDate: g.target_date,
    projects: projectList
      .filter(p => p.goal_id === g.id)
      .map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        dueDate: p.due_date
      }))
  }));

  const sources: AISource[] = alignedGoals.map(g => ({
    id: `goal-${g.id}`,
    entityId: g.id,
    type: 'goal',
    title: `Goal: ${g.name}`,
    description: `Progress: ${g.progress}%, Status: ${g.status}`,
    workspaceId,
    sourceKind: 'tool'
  }));

  return {
    goals: alignedGoals,
    sources
  };
}
