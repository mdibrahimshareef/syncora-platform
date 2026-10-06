import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowEventType } from './workflow-state';

export interface WorkflowEventPayload {
  workflowId: string;
  stepId?: string;
  workspaceId: string;
  userId: string;
  eventType: WorkflowEventType;
  status: string;
  metadata?: Record<string, any>;
}

export async function publishWorkflowEvent(
  supabase: SupabaseClient,
  payload: WorkflowEventPayload
) {
  // We need an atomic sequence generator. In Postgres, we could use a sequence or rely on created_at.
  // For simplicity and to avoid a custom SQL function call per event, we'll use a precise timestamp integer as sequence for now.
  const sequence = Date.now() * 1000 + Math.floor(Math.random() * 1000); // Microsecond approximation

  const { error } = await supabase.from('ai_workflow_events').insert({
    workflow_id: payload.workflowId,
    step_id: payload.stepId,
    workspace_id: payload.workspaceId,
    user_id: payload.userId,
    event_type: payload.eventType,
    status: payload.status,
    sequence: sequence,
    metadata: payload.metadata
  });

  if (error) {
    console.error('Failed to publish workflow event:', error);
    // Depending on strictness, we might throw here. 
    // For R4.2, we assume events are best-effort unless critical.
    // However, authoritative state requires these to succeed.
    throw new Error(`Event publication failed: ${error.message}`);
  }
}

export async function updateWorkflowState(
  supabase: SupabaseClient,
  workflowId: string,
  workspaceId: string,
  userId: string,
  status: string,
  updates?: Record<string, any>
) {
  const { error } = await supabase.from('ai_workflows')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...updates
    })
    .eq('id', workflowId)
    .eq('workspace_id', workspaceId); // Ensure workspace isolation

  if (error) {
    throw new Error(`Failed to update workflow state: ${error.message}`);
  }
}
