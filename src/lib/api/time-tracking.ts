import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TimeEntry } from '@/types';
import { dispatchEvent } from '@/lib/events/dispatcher';
import { SyncoraEvent } from '@/lib/integrations/types';

export async function createTimeEntry(
  supabase: SupabaseClient<Database>,
  data: {
    workspaceId: string;
    projectId?: string;
    taskId?: string;
    description?: string;
    startedAt?: string;
    endedAt?: string;
    durationMinutes: number;
    billable?: boolean;
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    source?: 'MANUAL' | 'TIMER' | 'AUTOMATION' | 'API';
  },
  userId: string
): Promise<TimeEntry> {
  const { data: newEntry, error } = await supabase
    .from('time_entries')
    .insert({
      workspace_id: data.workspaceId,
      project_id: data.projectId,
      task_id: data.taskId,
      user_id: userId,
      description: data.description,
      started_at: data.startedAt,
      ended_at: data.endedAt,
      duration_minutes: data.durationMinutes,
      billable: data.billable ?? false,
      status: data.status || 'DRAFT',
      source: data.source || 'MANUAL',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create time entry: ${error.message}`);
  }

  if (newEntry.project_id && newEntry.duration_minutes > 0) {
    await checkBudgetThresholds(supabase, newEntry.workspace_id, newEntry.project_id, userId);
  }

  return {
    id: newEntry.id,
    workspaceId: newEntry.workspace_id,
    projectId: newEntry.project_id,
    taskId: newEntry.task_id,
    userId: newEntry.user_id,
    description: newEntry.description,
    startedAt: newEntry.started_at,
    endedAt: newEntry.ended_at,
    durationMinutes: newEntry.duration_minutes,
    billable: newEntry.billable,
    status: newEntry.status as any,
    timesheetId: newEntry.timesheet_id,
    source: newEntry.source as any,
    createdAt: newEntry.created_at,
    updatedAt: newEntry.updated_at,
  };
}

export async function updateTimeEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  updates: Partial<{
    projectId: string;
    taskId: string;
    description: string;
    startedAt: string;
    endedAt: string;
    durationMinutes: number;
    billable: boolean;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  }>
): Promise<TimeEntry> {
  const updateData: any = {};
  if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
  if (updates.taskId !== undefined) updateData.task_id = updates.taskId;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
  if (updates.endedAt !== undefined) updateData.ended_at = updates.endedAt;
  if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes;
  if (updates.billable !== undefined) updateData.billable = updates.billable;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data: updatedEntry, error } = await supabase
    .from('time_entries')
    .update(updateData)
    .eq('id', entryId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update time entry: ${error.message}`);
  }

  if (updatedEntry.project_id && updatedEntry.duration_minutes > 0) {
    await checkBudgetThresholds(supabase, updatedEntry.workspace_id, updatedEntry.project_id, updatedEntry.user_id);
  }

  return {
    id: updatedEntry.id,
    workspaceId: updatedEntry.workspace_id,
    projectId: updatedEntry.project_id,
    taskId: updatedEntry.task_id,
    userId: updatedEntry.user_id,
    description: updatedEntry.description,
    startedAt: updatedEntry.started_at,
    endedAt: updatedEntry.ended_at,
    durationMinutes: updatedEntry.duration_minutes,
    billable: updatedEntry.billable,
    status: updatedEntry.status as any,
    timesheetId: updatedEntry.timesheet_id,
    source: updatedEntry.source as any,
    createdAt: updatedEntry.created_at,
    updatedAt: updatedEntry.updated_at,
  };
}

export async function checkBudgetThresholds(supabase: SupabaseClient<Database>, workspaceId: string, projectId: string, actorId: string) {
  // 1. Fetch budget
  const { data: budget } = await supabase
    .from('project_budgets')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (!budget || budget.budget_type !== 'TIME' || !budget.budget_minutes) return;
  const budgetMinutes = budget.budget_minutes;

  // 2. Aggregate actual time
  const { data: entries } = await supabase
    .from('time_entries')
    .select('duration_minutes')
    .eq('project_id', projectId)
    .not('duration_minutes', 'is', null);

  const actualMinutes = (entries || []).reduce((acc, entry) => acc + (entry.duration_minutes || 0), 0);
  const percentUsed = (actualMinutes / budgetMinutes) * 100;
  
  const threshold = budget.warning_threshold || 75;

  let updatePayload: any = {};
  let eventType: string | null = null;

  if (percentUsed >= 100 && !budget.critical_dispatched) {
    eventType = 'project.budget_critical_reached';
    updatePayload.critical_dispatched = true;
    updatePayload.warning_dispatched = true;
  } else if (percentUsed >= threshold && !budget.warning_dispatched) {
    eventType = 'project.budget_warning_reached';
    updatePayload.warning_dispatched = true;
  }

  if (eventType) {
    // update budget idempotency flags
    await supabase.from('project_budgets').update(updatePayload).eq('id', budget.id);
    
    // dispatch event
    const event: SyncoraEvent = {
      id: crypto.randomUUID(),
      type: eventType as any,
      timestamp: new Date().toISOString(),
      workspaceId,
      actorId,
      payload: {
        projectId,
        actualMinutes,
        budgetMinutes,
        percentUsed
      }
    };
    
    dispatchEvent(event).catch(console.error);
  }
}
