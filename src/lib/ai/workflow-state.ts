import { WorkflowState } from './workflow-schema';

// Step states
export type StepState =
  | 'PENDING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED'
  | 'CANCELLED';

// Event types
export type WorkflowEventType =
  | 'WORKFLOW_CREATED'
  | 'PLAN_READY'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WORKFLOW_STARTED'
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'STEP_VERIFICATION_STARTED'
  | 'STEP_VERIFIED'
  | 'STEP_FAILED'
  | 'STEP_RETRYING'
  | 'STEP_SKIPPED'
  | 'WORKFLOW_PAUSED'
  | 'WORKFLOW_RESUMED'
  | 'WORKFLOW_CANCELLED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_PARTIALLY_COMPLETED'
  | 'RECOVERY_STARTED'
  | 'RECOVERY_COMPLETED'
  | 'RECOVERY_FAILED'
  | 'CANCELLATION_REQUESTED';

export function isValidWorkflowTransition(current: WorkflowState, next: WorkflowState): boolean {
  switch (current) {
    case 'PLANNING':
      return next === 'AWAITING_APPROVAL';
    case 'AWAITING_APPROVAL':
      return ['EXECUTING', 'CANCELLED'].includes(next);
    case 'EXECUTING':
      return ['VERIFYING', 'PAUSED', 'FAILED', 'CANCELLATION_REQUESTED', 'CANCELLED'].includes(next);
    case 'VERIFYING':
      return ['EXECUTING', 'COMPLETED', 'VERIFICATION_FAILED', 'PARTIALLY_COMPLETED'].includes(next);
    case 'FAILED':
    case 'VERIFICATION_FAILED':
      return ['RECOVERING', 'CANCELLED'].includes(next);
    case 'PARTIALLY_COMPLETED':
      return ['RECOVERING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(next);
    case 'PAUSED':
      return ['EXECUTING', 'RECOVERING', 'CANCELLED'].includes(next);
    case 'RECOVERING':
      return ['EXECUTING', 'FAILED', 'CANCELLED'].includes(next);
    case 'CANCELLATION_REQUESTED':
      return next === 'CANCELLED';
    case 'COMPLETED':
    case 'CANCELLED':
      return false; // Terminal states
    default:
      return false;
  }
}

export function isValidStepTransition(current: StepState, next: StepState): boolean {
  switch (current) {
    case 'PENDING':
      return ['EXECUTING', 'CANCELLED', 'SKIPPED'].includes(next);
    case 'EXECUTING':
      return ['VERIFYING', 'FAILED', 'CANCELLED'].includes(next);
    case 'VERIFYING':
      return ['COMPLETED', 'FAILED'].includes(next);
    case 'FAILED':
      return ['RETRYING', 'SKIPPED'].includes(next);
    case 'RETRYING':
      return ['EXECUTING', 'CANCELLED'].includes(next);
    case 'COMPLETED':
    case 'CANCELLED':
    case 'SKIPPED':
      return false; // Terminal states
    default:
      return false;
  }
}
