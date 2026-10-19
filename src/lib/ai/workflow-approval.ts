import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowPlan } from './workflow-schema';
import { computePlanDigest } from './autonomy';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

export interface WorkflowApprovalRecord {
  approvalId: string;
  workflowId: string;
  workspaceId: string;
  approverId: string;
  planDigest: string;
  status: ApprovalStatus;
  approvedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
}

export interface ValidationApprovalResult {
  valid: boolean;
  status: ApprovalStatus;
  reason?: string;
  approvalRecord?: WorkflowApprovalRecord;
}

/**
 * Creates or updates an approval record strongly bound to the exact plan digest.
 * If any parameter or step in the plan changes later, the plan digest will diverge,
 * automatically invalidating the approval.
 */
export async function createApprovalBinding(
  supabase: SupabaseClient,
  params: {
    workflowId: string;
    workspaceId: string;
    approverId: string;
    plan: WorkflowPlan;
    status?: ApprovalStatus;
    ttlMinutes?: number;
    rejectionReason?: string;
  }
): Promise<WorkflowApprovalRecord> {
  const { workflowId, workspaceId, approverId, plan, status = 'APPROVED', ttlMinutes = 60, rejectionReason } = params;
  const planDigest = computePlanDigest(plan);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
  const approvalId = `approval-${workflowId}`;

  const record: WorkflowApprovalRecord = {
    approvalId,
    workflowId,
    workspaceId,
    approverId,
    planDigest,
    status,
    approvedAt: status === 'APPROVED' ? now.toISOString() : undefined,
    expiresAt,
    rejectionReason
  };

  // Upsert into ai_action_logs with action_type='WORKFLOW_APPROVAL' for durable audit & state tracking
  await supabase
    .from('ai_action_logs')
    .upsert({
      action_id: approvalId,
      workspace_id: workspaceId,
      user_id: approverId,
      action_type: 'WORKFLOW_APPROVAL',
      status: status.toLowerCase(),
      payload: {
        workflowId,
        planDigest,
        status,
        expiresAt,
        rejectionReason
      },
      completed_at: status === 'APPROVED' || status === 'REJECTED' ? now.toISOString() : null
    }, { onConflict: 'action_id' });

  return record;
}

/**
 * Pure synchronous verification of an approval record against current plan and workspace.
 */
export function verifyApprovalRecordIntegrity(
  record: WorkflowApprovalRecord,
  currentPlan: WorkflowPlan,
  targetWorkspaceId: string
): ValidationApprovalResult {
  if (record.workspaceId !== targetWorkspaceId) {
    return {
      valid: false,
      status: record.status,
      reason: `Workspace mismatch: approval belongs to workspace '${record.workspaceId}', cannot execute in '${targetWorkspaceId}'.`
    };
  }

  if (record.status === 'REJECTED') {
    return {
      valid: false,
      status: 'REJECTED',
      reason: `Approval was explicitly rejected: ${record.rejectionReason || 'User rejected proposed plan'}`
    };
  }

  if (record.status !== 'APPROVED') {
    return {
      valid: false,
      status: record.status,
      reason: `Workflow approval is currently in state '${record.status}'.`
    };
  }

  if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
    return {
      valid: false,
      status: 'EXPIRED',
      reason: 'The human approval has expired. Re-approval is required.'
    };
  }

  const currentDigest = computePlanDigest(currentPlan);
  if (record.planDigest !== currentDigest) {
    return {
      valid: false,
      status: 'REVOKED',
      reason: 'Plan digest mismatch: Plan has been modified after approval was granted. Execution blocked.'
    };
  }

  return {
    valid: true,
    status: 'APPROVED',
    approvalRecord: record
  };
}

/**
 * Validates approval integrity from the authoritative database:
 * 1. Checks that an approval exists for the workflow and workspace.
 * 2. Compares the current canonical plan digest against the approved digest.
 *    Any deviation in steps, args, or order immediately triggers PLAN_ALTERED_AFTER_APPROVAL.
 * 3. Verifies approval has not expired.
 * 4. Verifies approval status is APPROVED.
 */
export async function validateApprovalIntegrity(
  supabase: SupabaseClient,
  workflowId: string,
  workspaceId: string,
  currentPlan: WorkflowPlan
): Promise<ValidationApprovalResult> {
  const approvalId = `approval-${workflowId}`;

  const { data: log, error } = await supabase
    .from('ai_action_logs')
    .select('*')
    .eq('action_id', approvalId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !log || !log.payload) {
    return {
      valid: false,
      status: 'PENDING',
      reason: 'No approval record found for this workflow.'
    };
  }

  const payload = log.payload as Record<string, unknown>;
  const approvalStatus = (payload.status as ApprovalStatus) || 'PENDING';
  const approvedDigest = (payload.planDigest as string) || '';
  const expiresAt = payload.expiresAt as string | undefined;

  const record: WorkflowApprovalRecord = {
    approvalId,
    workflowId,
    workspaceId,
    approverId: log.user_id,
    planDigest: approvedDigest,
    status: approvalStatus,
    approvedAt: log.completed_at || undefined,
    expiresAt,
    rejectionReason: payload.rejectionReason as string | undefined
  };

  return verifyApprovalRecordIntegrity(record, currentPlan, workspaceId);
}

