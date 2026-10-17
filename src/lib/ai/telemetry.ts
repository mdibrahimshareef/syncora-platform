import { AIErrorCategory } from './errors';

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
 * Sensitive field allowlist / denylist patterns for enterprise privacy.
 * Strictly redacts passwords, bearer tokens, API keys, cookies, and secret headers.
 */
const SENSITIVE_KEY_REGEX = /^(password|token|secret|authorization|cookie|apiKey|api_key|serviceRoleKey|service_role_key|accessToken|access_token|refreshToken|refresh_token)$/i;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const OPENAI_KEY_REGEX = /sk-[A-Za-z0-9\-_]{20,}/gi;
const GOOGLE_KEY_REGEX = /AIza[0-9A-Za-z\-_]{25,}/gi;

/**
 * Deeply sanitizes and redacts sensitive data from payloads before logging.
 */
export function redactSensitiveData<T>(input: T, seen = new WeakSet<object>()): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input.replace(BEARER_REGEX, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(OPENAI_KEY_REGEX, 'sk-[REDACTED]');
    sanitized = sanitized.replace(GOOGLE_KEY_REGEX, 'AIza[REDACTED]');
    return sanitized as unknown as T;
  }

  if (typeof input !== 'object') {
    return input;
  }

  // Prevent cyclical object recursion
  if (seen.has(input as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map(item => redactSensitiveData(item, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitiveData(val, seen);
    }
  }

  return result as T;
}

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
