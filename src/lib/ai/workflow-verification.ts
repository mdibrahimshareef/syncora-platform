import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowStep } from './workflow-schema';

export type VerificationState = 'succeeded' | 'failed' | 'unknown' | 'needs_review';

export interface PreconditionResult {
  passed: boolean;
  reason?: string;
  reasons?: string[];
  currentSnapshot?: Record<string, unknown>;
}

export interface PostconditionResult {
  status: VerificationState;
  verified: boolean;
  verifiedState?: Record<string, unknown>;
  error?: string;
  mismatches?: string[];
}

/**
 * Authoritative Precondition Verification:
 * Validates that target entities exist, belong to the current workspace,
 * and match any expected state prior to executing a step.
 */
export async function verifyStepPreconditions(
  supabase: SupabaseClient,
  workspaceId: string,
  userIdOrStep: string | WorkflowStep,
  maybeStep?: WorkflowStep
): Promise<PreconditionResult> {
  const step = (maybeStep || userIdOrStep) as WorkflowStep;
  const { tool, args } = step;
  const expectedState = step.expectedState;
  const explicitPreconditions = (step as Record<string, unknown>).preconditions as Array<{ field: string; expectedValue: unknown }> | undefined;

  if (tool === 'create_task') {
    const projectId = args.projectId;
    if (projectId) {
      const { data: proj, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !proj) {
        return { passed: false, reason: `Target project ${projectId} not found in this workspace.`, reasons: [`Target project ${projectId} not found in this workspace.`] };
      }
    }

    if (args.assigneeId) {
      const { data: member, error } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('user_id', args.assigneeId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !member) {
        return { passed: false, reason: `Assignee ${args.assigneeId} is not a member of this workspace.`, reasons: [`Assignee ${args.assigneeId} is not a member of this workspace.`] };
      }
    }

    return { passed: true, reasons: [] };
  }

  if (tool === 'update_task' || tool === 'assign_task') {
    const taskId = args.taskId || args.id;
    if (!taskId) {
      return { passed: false, reason: 'Missing taskId argument.', reasons: ['Missing taskId argument.'] };
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, assignee_id, workspace_id')
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !task) {
      return { passed: false, reason: `Task ${taskId} not found or access denied in this workspace.`, reasons: [`Task ${taskId} not found or access denied in this workspace.`] };
    }

    // Stale State Detection (Optimistic Concurrency)
    if (expectedState) {
      if (expectedState.status && task.status !== expectedState.status) {
        const msg = `Precondition failed: Task status is '${task.status}' but expected '${expectedState.status}'.`;
        return {
          passed: false,
          reason: msg,
          reasons: [msg],
          currentSnapshot: task
        };
      }
      if (expectedState.assigneeId !== undefined && task.assignee_id !== expectedState.assigneeId) {
        const msg = `Precondition failed: Task assignee is '${task.assignee_id}' but expected '${expectedState.assigneeId}'.`;
        return {
          passed: false,
          reason: msg,
          reasons: [msg],
          currentSnapshot: task
        };
      }
    }

    if (Array.isArray(explicitPreconditions)) {
      for (const prec of explicitPreconditions) {
        const actualVal = (task as Record<string, unknown>)[prec.field];
        if (actualVal !== prec.expectedValue) {
          const msg = `Precondition failed for field "${prec.field}": expected "${prec.expectedValue}", authoritative db has "${actualVal}".`;
          return {
            passed: false,
            reason: msg,
            reasons: [msg],
            currentSnapshot: task
          };
        }
      }
    }

    return {
      passed: true,
      reasons: [],
      currentSnapshot: task
    };
  }

  // Read tools (get_my_work, get_project_health, search) have no preconditions
  return { passed: true, reasons: [] };
}

/**
 * Authoritative Postcondition Verification:
 * Queries the authoritative database to verify that the mutation actually took effect.
 * Differentiates 'succeeded' from 'unknown' or 'needs_review' rather than assuming success.
 */
export async function verifyStepPostconditions(
  supabase: SupabaseClient,
  workspaceId: string,
  step: WorkflowStep,
  executionResult: { status: string; data?: unknown; error?: string }
): Promise<PostconditionResult> {
  const { tool, args } = step;

  if (executionResult.status !== 'completed' && executionResult.status !== 'succeeded') {
    const errorMsg = executionResult.error || 'Action execution did not complete successfully.';
    return {
      status: 'failed',
      verified: false,
      error: errorMsg,
      mismatches: [errorMsg]
    };
  }

  try {
    if (tool === 'create_task') {
      const dataRecord = executionResult.data as Record<string, unknown> | undefined;
      const createdId = dataRecord?.id as string | undefined;
      if (!createdId) {
        const errorMsg = 'Mutation returned success but no task ID was provided.';
        return { status: 'unknown', verified: false, error: errorMsg, mismatches: [errorMsg] };
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, workspace_id')
        .eq('id', createdId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !task) {
        const errorMsg = 'Created task could not be verified in database.';
        return { status: 'needs_review', verified: false, error: errorMsg, mismatches: [errorMsg] };
      }

      return { status: 'succeeded', verified: true, verifiedState: task, mismatches: [] };
    }

    if (tool === 'update_task') {
      const taskId = args.taskId || args.id;
      const updates = (args.updates || args) as Record<string, unknown>;

      const { data: task, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assignee_id, workspace_id')
        .eq('id', taskId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !task) {
        const errorMsg = 'Task not found during post-execution verification.';
        return { status: 'needs_review', verified: false, error: errorMsg, mismatches: [errorMsg] };
      }

      if (updates.status && task.status !== updates.status) {
        const errorMsg = `status: expected "${updates.status}", authoritative db has "${task.status}".`;
        return {
          status: 'needs_review',
          verified: false,
          verifiedState: task,
          error: `Verification mismatch: status is '${task.status}', expected '${updates.status}'.`,
          mismatches: [errorMsg]
        };
      }

      if (updates.priority && task.priority !== updates.priority) {
        const errorMsg = `priority: expected "${updates.priority}", authoritative db has "${task.priority}".`;
        return {
          status: 'needs_review',
          verified: false,
          verifiedState: task,
          error: `Verification mismatch: priority is '${task.priority}', expected '${updates.priority}'.`,
          mismatches: [errorMsg]
        };
      }

      return { status: 'succeeded', verified: true, verifiedState: task, mismatches: [] };
    }

    if (tool === 'assign_task') {
      const taskId = args.taskId;
      const expectedAssignee = args.assigneeId;

      const { data: task, error } = await supabase
        .from('tasks')
        .select('id, assignee_id, workspace_id')
        .eq('id', taskId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !task) {
        return { status: 'needs_review', verified: false, error: 'Task not found during post-execution verification.', mismatches: ['Task not found during post-execution verification.'] };
      }

      if (expectedAssignee && task.assignee_id !== expectedAssignee) {
        const errorMsg = `Verification mismatch: assignee is '${task.assignee_id}', expected '${expectedAssignee}'.`;
        return {
          status: 'needs_review',
          verified: false,
          verifiedState: task,
          error: errorMsg,
          mismatches: [errorMsg]
        };
      }

      return { status: 'succeeded', verified: true, verifiedState: task, mismatches: [] };
    }

    return { status: 'succeeded', verified: true, verifiedState: (executionResult.data as Record<string, unknown>) || undefined, mismatches: [] };

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database query exception during verification';
    return {
      status: 'unknown',
      verified: false,
      error: errorMsg,
      mismatches: [errorMsg]
    };
  }
}
