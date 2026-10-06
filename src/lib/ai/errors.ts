export type AIErrorCategory = 
  | 'AUTH_REQUIRED'
  | 'WORKSPACE_FORBIDDEN'
  | 'CONTEXT_UNAVAILABLE'
  | 'MODEL_ERROR'
  | 'RATE_LIMITED'
  | 'TOOL_ERROR'
  | 'VALIDATION_ERROR'
  | 'STALE_STATE'
  | 'ACTION_DENIED'
  | 'ACTION_CONFLICT'
  | 'ACTION_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | 'WORKFLOW_INVALID'
  | 'WORKFLOW_TOO_LARGE'
  | 'WORKFLOW_CYCLE'
  | 'WORKFLOW_UNAUTHORIZED'
  | 'WORKFLOW_APPROVAL_REQUIRED'
  | 'WORKFLOW_CANCELLED'
  | 'WORKFLOW_STEP_FAILED'
  | 'WORKFLOW_PARTIAL_FAILURE'
  | 'WORKFLOW_VERIFICATION_FAILED'
  | 'WORKFLOW_STALE_STATE'
  | 'WORKFLOW_IDEMPOTENCY_CONFLICT';

export type RecoveryClassification =
  | 'RECOVERABLE'
  | 'NON_RECOVERABLE'
  | 'ALREADY_COMPLETED'
  | 'STALE_STATE'
  | 'AUTHORIZATION_FAILURE'
  | 'VERIFICATION_FAILURE'
  | 'SYSTEM_FAILURE';

export class AIError extends Error {
  public category: AIErrorCategory;
  public userMessage: string;

  constructor(category: AIErrorCategory, internalMessage?: string) {
    super(internalMessage || category);
    this.name = 'AIError';
    this.category = category;
    this.userMessage = getUserFacingMessage(category);
  }
}

export function getUserFacingMessage(category: AIErrorCategory): string {
  switch (category) {
    case 'AUTH_REQUIRED':
      return 'You must be logged in to use the AI assistant.';
    case 'WORKSPACE_FORBIDDEN':
      return 'You do not have access to this workspace.';
    case 'CONTEXT_UNAVAILABLE':
      return 'Unable to retrieve workspace context at this time.';
    case 'MODEL_ERROR':
      return 'The AI model encountered an unexpected error. Please try again.';
    case 'RATE_LIMITED':
      return 'You have reached the request limit. Please wait a moment before trying again.';
    case 'TOOL_ERROR':
      return 'An error occurred while fetching data from the workspace.';
    case 'VALIDATION_ERROR':
      return 'The provided information was invalid or incomplete.';
    case 'STALE_STATE':
      return 'The workspace data changed while processing your request. Please review and try again.';
    case 'ACTION_DENIED':
      return 'You do not have permission to perform this action.';
    case 'ACTION_CONFLICT':
      return 'This action conflicts with another recent change.';
    case 'ACTION_FAILED':
      return 'The action failed to execute. Please try again.';
    case 'TIMEOUT':
      return 'The request took too long to complete. Please try a simpler request.';
    case 'WORKFLOW_INVALID':
      return 'The generated workflow plan is invalid.';
    case 'WORKFLOW_TOO_LARGE':
      return 'The workflow plan exceeds the maximum number of steps allowed.';
    case 'WORKFLOW_CYCLE':
      return 'The workflow plan contains invalid or cyclic dependencies.';
    case 'WORKFLOW_UNAUTHORIZED':
      return 'You do not have permission to execute this workflow.';
    case 'WORKFLOW_APPROVAL_REQUIRED':
      return 'This workflow requires explicit approval before execution.';
    case 'WORKFLOW_CANCELLED':
      return 'The workflow was cancelled.';
    case 'WORKFLOW_STEP_FAILED':
      return 'A step in the workflow failed to execute.';
    case 'WORKFLOW_PARTIAL_FAILURE':
      return 'The workflow partially completed, but failed on a subsequent step.';
    case 'WORKFLOW_VERIFICATION_FAILED':
      return 'The workflow executed, but failed post-action state verification.';
    case 'WORKFLOW_STALE_STATE':
      return 'This workflow is based on older project data. Review the current state before continuing.';
    case 'WORKFLOW_IDEMPOTENCY_CONFLICT':
      return 'Syncora couldn\'t create this task because it appears to already exist.';
    case 'UNKNOWN':
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}
