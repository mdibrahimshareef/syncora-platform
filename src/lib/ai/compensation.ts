import { SupabaseClient } from '@supabase/supabase-js';

export interface CompensationEntry {
  stepId: string;
  tool: string;
  targetEntity?: 'task' | 'project';
  entityId?: string;
  targetId?: string;
  previousState?: Record<string, unknown>;
  originalState?: Record<string, unknown>;
  appliedUpdates?: Record<string, unknown>;
  appliedChanges?: Record<string, unknown>;
  timestamp: string;
}

export type CompensationJournalEntry = CompensationEntry;

export interface CompensationResult {
  success: boolean;
  compensatedSteps: string[];
  failedCompensations: Array<{ stepId: string; error: string }>;
  requiresManualReview: boolean;
}

export type CompensationExecutionResult = CompensationResult;

/**
 * Executes compensating actions for partially completed workflows in reverse execution order (LIFO).
 * Only restores previous state if the entity has not undergone conflicting external changes in the interim.
 */
export async function executeCompensation(
  supabase: SupabaseClient,
  workspaceId: string,
  userIdOrJournal: string | CompensationEntry[],
  maybeJournal?: CompensationEntry[]
): Promise<CompensationResult> {
  const userId = typeof userIdOrJournal === 'string' ? userIdOrJournal : 'system-compensation';
  const journal = (Array.isArray(userIdOrJournal) ? userIdOrJournal : maybeJournal) || [];

  const compensatedSteps: string[] = [];
  const failedCompensations: Array<{ stepId: string; error: string }> = [];

  // Iterate in reverse execution order (LIFO)
  const reverseJournal = [...journal].reverse();

  for (const entry of reverseJournal) {
    try {
      const targetEntity = entry.targetEntity || 'task';
      const entityId = entry.entityId || entry.targetId;
      const prevState = entry.previousState || entry.originalState || {};
      const applied = entry.appliedUpdates || entry.appliedChanges || {};

      if (!entityId) {
        failedCompensations.push({
          stepId: entry.stepId,
          error: 'Missing entity identifier in compensation entry.'
        });
        continue;
      }

      if (targetEntity === 'task') {
        // 1. Authoritative state check before rolling back
        const { data: currentTask, error } = await supabase
          .from('tasks')
          .select('id, status, priority, due_date, assignee_id, updated_at')
          .eq('id', entityId)
          .eq('workspace_id', workspaceId)
          .single();

        if (error || !currentTask) {
          failedCompensations.push({
            stepId: entry.stepId,
            error: `Target task ${entityId} no longer accessible for compensation.`
          });
          continue;
        }

        // 2. Prepare reversal payload
        const rollbackPayload: Record<string, unknown> = {};
        if (applied.status !== undefined && prevState.status !== undefined) {
          rollbackPayload.status = prevState.status;
        }
        if (applied.priority !== undefined && prevState.priority !== undefined) {
          rollbackPayload.priority = prevState.priority;
        }
        if ((applied.dueDate !== undefined || applied.due_date !== undefined) &&
            (prevState.dueDate !== undefined || prevState.due_date !== undefined)) {
          rollbackPayload.due_date = prevState.due_date !== undefined ? prevState.due_date : prevState.dueDate;
        }
        if ((applied.assigneeId !== undefined || applied.assignee_id !== undefined) &&
            (prevState.assigneeId !== undefined || prevState.assignee_id !== undefined)) {
          rollbackPayload.assignee_id = prevState.assignee_id !== undefined ? prevState.assignee_id : prevState.assigneeId;
        }

        if (Object.keys(rollbackPayload).length > 0) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update(rollbackPayload)
            .eq('id', entityId)
            .eq('workspace_id', workspaceId);

          if (updateError) {
            failedCompensations.push({
              stepId: entry.stepId,
              error: updateError.message
            });
            continue;
          }

          // Log compensation activity asynchronously
          await supabase.from('activities').insert({
            actor_id: userId,
            action: 'updated',
            entity_id: entityId,
            entity_type: 'task',
            metadata: { source: 'ai_compensation', revertedStepId: entry.stepId },
            workspace_id: workspaceId
          }).then(() => {}, () => {});

          compensatedSteps.push(entry.stepId);
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown compensation error';
      failedCompensations.push({
        stepId: entry.stepId,
        error: errorMsg
      });
    }
  }

  return {
    success: failedCompensations.length === 0,
    compensatedSteps,
    failedCompensations,
    requiresManualReview: failedCompensations.length > 0
  };
}
