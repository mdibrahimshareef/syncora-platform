import { AIErrorCategory } from './errors';
import { redactSensitiveData } from '../observability/redaction';

export { redactSensitiveData };

export type TraceContext = {
  traceId: string;
  requestId?: string;
  workspaceId: string;
  userId?: string;
  jobId?: string;
  workflowId?: string;
  stepId?: string;
  provider?: string;
  model?: string;
};

export type StructuredAIEventName =
  | 'REQUEST_ACCEPTED'
  | 'CONTEXT_RETRIEVAL_START'
  | 'CONTEXT_RETRIEVAL_COMPLETE'
  | 'PROVIDER_INVOCATION_START'
  | 'PROVIDER_INVOCATION_COMPLETE'
  | 'TOOL_INVOCATION_START'
  | 'TOOL_INVOCATION_COMPLETE'
  | 'WORKFLOW_STARTED'
  | 'WORKFLOW_COMPLETED'
  | 'JOB_CLAIMED'
  | 'LEASE_RENEWED'
  | 'RETRY_SCHEDULED'
  | 'RECOVERY_ATTEMPTED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_COMPLETED'
  | 'ACTION_VERIFIED'
  | 'REQUEST_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'PROVIDER_UNAVAILABLE';

export type StructuredAIEvent = {
  eventName: StructuredAIEventName;
  timestamp: string;
  traceContext: TraceContext;
  durationMs?: number;
  errorCategory?: AIErrorCategory | string;
  metadata?: Record<string, unknown>;
  environment: string;
};

export type AITelemetry = {
  requestId: string;
  traceId?: string;
  userId?: string;
  workspaceId: string;
  model: string;
  latencyMs: number;
  toolCallsCount: number;
  errorCategory?: string;
  success: boolean;
  workflowId?: string;
  planStepCount?: number;
  workflowStatus?: string;
  riskLevel?: string;
  approvalRequired?: boolean;
  approvalGranted?: boolean;
  executionDurationMs?: number;
  verificationFailures?: number;
  completedStepCount?: number;
  failedStepCount?: number;
  cancelledStepCount?: number;
  retryCount?: number;
  recoveryCount?: number;
  timeToApprovalMs?: number;
  timePerStepMs?: number;
  cancellationCount?: number;
  resumeCount?: number;
  realtimeReconnectCount?: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

/**
 * Creates or derives a traceable correlation context.
 * An identifier must never be treated as proof that a caller may access a workspace or job.
 */
export function createTraceContext(params: {
  workspaceId: string;
  traceId?: string;
  requestId?: string;
  userId?: string;
  jobId?: string;
  workflowId?: string;
  stepId?: string;
  provider?: string;
  model?: string;
}): TraceContext {
  return {
    traceId: params.traceId || crypto.randomUUID(),
    requestId: params.requestId || crypto.randomUUID(),
    workspaceId: params.workspaceId,
    userId: params.userId,
    jobId: params.jobId,
    workflowId: params.workflowId,
    stepId: params.stepId,
    provider: params.provider,
    model: params.model,
  };
}

/**
 * Standardized enterprise structured event logger for AI and background operations.
 */
export function logStructuredAIEvent(event: Omit<StructuredAIEvent, 'timestamp' | 'environment'>): void {
  const structured: StructuredAIEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    metadata: event.metadata ? (redactSensitiveData(event.metadata) as Record<string, unknown>) : undefined,
  };

  const serialized = JSON.stringify(structured);
  if (event.errorCategory) {
    console.error(serialized);
  } else {
    console.info(serialized);
  }
}

/**
 * Legacy-compatible AI telemetry logger with integrated redaction and trace correlation.
 */
export function logAITelemetry(telemetry: AITelemetry): void {
  const sanitized = redactSensitiveData(telemetry);
  const logPayload = {
    timestamp: new Date().toISOString(),
    type: 'AI_TELEMETRY',
    environment: process.env.NODE_ENV || 'development',
    ...sanitized,
  };

  if (telemetry.success) {
    console.info(JSON.stringify(logPayload));
  } else {
    console.error(JSON.stringify(logPayload));
  }
}
