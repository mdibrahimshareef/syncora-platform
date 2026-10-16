import { SupabaseClient } from '@supabase/supabase-js';
import { AISource, resolveSourceUrl } from './sources';

export interface PredictiveRiskEstimate {
  predictedEvent: string;
  timeHorizon: string;
  supportingEvidence: string[];
  keyAssumptions: string[];
  uncertaintyLevel: 'Low' | 'Medium' | 'High';
  confidenceScore?: number; // 0-100, uncalibrated indicative score
  missingDataNotice?: string;
  suggestedAction: string;
}

export interface DeterministicTemporalSignal {
  category: 'deadline_imminent' | 'milestone_threatened' | 'overdue_slip' | 'inactive_stall';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  evidence: string;
  entityId: string;
  entityType: 'task' | 'milestone' | 'project';
  dateReference?: string | null;
}

export interface TemporalRiskAnalysis {
  projectId: string;
  projectName: string;
  projectDueDate: string | null;
  serverTimestamp: string;
  timezone: string;
  daysRemaining: number | null;
  completionRatePercent: number;
  deterministicSignals: DeterministicTemporalSignal[];
  predictiveEstimates: PredictiveRiskEstimate[];
  sources: AISource[];
}

/**
 * Analyzes temporal risk and propagates dependency slippage.
 * Distinctly separates deterministic signals from predictive estimates.
 */
export async function analyzeTemporalProjectRisks(
  supabase: SupabaseClient,
  workspaceId: string,
  projectId: string,
  nowOverride?: Date
): Promise<TemporalRiskAnalysis> {
  const now = nowOverride || new Date();
  const nowMs = now.getTime();
  const serverTimestamp = now.toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // 1. Fetch Project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, due_date, created_at, status')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!project) {
    throw new Error(`Project ${projectId} not found in workspace ${workspaceId}`);
  }

  // 2. Fetch Tasks & Milestones
  const [tasksRes, milestonesRes, depsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, created_at, updated_at, assignee_id')
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .limit(100),
    supabase
      .from('milestones')
      .select('id, name, due_date, status')
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .limit(20),
    supabase
      .from('task_dependencies')
      .select('task_id, depends_on_task_id, type')
      .eq('type', 'blocking')
  ]);

  const tasks = tasksRes.data || [];
  const milestones = milestonesRes.data || [];
  const dependencies = depsRes.data || [];

  const taskMap = new Map<string, typeof tasks[0]>();
  tasks.forEach(t => taskMap.set(t.id, t));

  // 3. Deterministic calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'Completed');
  const completionRatePercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  let daysRemaining: number | null = null;
  if (project.due_date) {
    const dueMs = new Date(project.due_date).getTime();
    daysRemaining = Math.round((dueMs - nowMs) / (1000 * 60 * 60 * 24));
  }

  const deterministicSignals: DeterministicTemporalSignal[] = [];
  const predictiveEstimates: PredictiveRiskEstimate[] = [];

  // Overdue Tasks Signal
  const overdueTasks = tasks.filter(
    t => t.due_date && new Date(t.due_date).getTime() < nowMs && t.status !== 'Done' && t.status !== 'Completed'
  );

  if (overdueTasks.length > 0) {
    deterministicSignals.push({
      category: 'overdue_slip',
      severity: overdueTasks.length > 3 ? 'critical' : 'high',
      title: `${overdueTasks.length} tasks past deadline`,
      evidence: overdueTasks.map(t => `"${t.title}" due on ${t.due_date}`).join('; '),
      entityId: projectId,
      entityType: 'project'
    });
  }

  // Imminent Tasks (due within 72 hours, not completed)
  const threeDaysMs = 72 * 60 * 60 * 1000;
  const imminentTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'Done' || t.status === 'Completed') return false;
    const diff = new Date(t.due_date).getTime() - nowMs;
    return diff >= 0 && diff <= threeDaysMs;
  });

  for (const it of imminentTasks) {
    deterministicSignals.push({
      category: 'deadline_imminent',
      severity: it.status === 'Blocked' ? 'critical' : 'medium',
      title: `Task "${it.title}" due within 72 hours`,
      evidence: `Due on ${it.due_date}. Current status: ${it.status}.`,
      entityId: it.id,
      entityType: 'task',
      dateReference: it.due_date
    });
  }

  // 4. Milestone Risk Propagation via Dependency Chains
  for (const m of milestones) {
    if (!m.due_date || m.status === 'Completed') continue;
    const mDueMs = new Date(m.due_date).getTime();
    const daysToMilestone = Math.round((mDueMs - nowMs) / (1000 * 60 * 60 * 24));

    // Check if any overdue task blocks tasks associated with this project
    const blockingOverdue = overdueTasks.filter(ot =>
      dependencies.some(d => d.depends_on_task_id === ot.id)
    );

    if (blockingOverdue.length > 0) {
      deterministicSignals.push({
        category: 'milestone_threatened',
        severity: daysToMilestone <= 7 ? 'critical' : 'high',
        title: `Milestone "${m.name}" threatened by dependency slippage`,
        evidence: `Milestone target is ${m.due_date} (${daysToMilestone} days remaining). Blocked by ${blockingOverdue.length} overdue upstream task(s).`,
        entityId: m.id,
        entityType: 'milestone',
        dateReference: m.due_date
      });

      // Predictive estimate with explicit uncertainty and assumptions
      predictiveEstimates.push({
        predictedEvent: `Milestone "${m.name}" is likely to miss target completion date of ${m.due_date}.`,
        timeHorizon: `${Math.max(daysToMilestone, 1)} days`,
        supportingEvidence: [
          `${blockingOverdue.length} upstream prerequisite tasks are already overdue: ${blockingOverdue.map(t => t.title).join(', ')}`,
          `Current overall project completion is ${completionRatePercent}%`
        ],
        keyAssumptions: [
          'Assumes upstream blockers cannot be completed instantaneously',
          'Assumes downstream tasks require standard execution time after unblocking'
        ],
        uncertaintyLevel: daysToMilestone <= 3 ? 'Low' : 'Medium',
        confidenceScore: daysToMilestone <= 3 ? 90 : 75,
        missingDataNotice: 'Does not account for unrecorded overtime or sudden scope cuts.',
        suggestedAction: `Reschedule milestone "${m.name}" or expedite blocker "${blockingOverdue[0].title}".`
      });
    }
  }

  // 5. Project Target Slip Prediction
  if (daysRemaining !== null && daysRemaining <= 14 && completionRatePercent < 60) {
    predictiveEstimates.push({
      predictedEvent: `Project target date (${project.due_date}) at risk of overrun.`,
      timeHorizon: `${daysRemaining} days`,
      supportingEvidence: [
        `Only ${completionRatePercent}% of tasks completed with ${daysRemaining} days remaining`,
        `${overdueTasks.length} tasks currently overdue`
      ],
      keyAssumptions: [
        'Historical velocity indicates current completion pace is insufficient to finish remaining tasks by target date'
      ],
      uncertaintyLevel: totalTasks < 5 ? 'High' : 'Medium',
      confidenceScore: totalTasks < 5 ? 60 : 85,
      missingDataNotice: totalTasks < 5 ? 'Low task count in project limits statistical confidence.' : undefined,
      suggestedAction: 'Review remaining task scope, reassign blocked items, or communicate revised timeline.'
    });
  }

  const projectUrl = await resolveSourceUrl(workspaceId, 'project', projectId);
  const sources: AISource[] = [{
    id: `temporal-risk-${projectId}`,
    entityId: projectId,
    type: 'project',
    title: `Temporal Risk: ${project.name}`,
    description: `Target: ${project.due_date || 'None'}. Signals: ${deterministicSignals.length}, Predictions: ${predictiveEstimates.length}`,
    workspaceId,
    sourceKind: 'analysis',
    url: projectUrl
  }];

  return {
    projectId,
    projectName: project.name,
    projectDueDate: project.due_date,
    serverTimestamp,
    timezone,
    daysRemaining,
    completionRatePercent,
    deterministicSignals,
    predictiveEstimates,
    sources
  };
}
