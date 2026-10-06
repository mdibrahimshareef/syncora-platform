export type AITelemetry = {
  requestId: string;
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
};

export function logAITelemetry(telemetry: AITelemetry) {
  // In a production environment, this would be sent to a structured log sink
  // like Datadog, Axiom, or GCP Cloud Logging.
  // For AI R1, we output structured JSON to stdout which is automatically captured by Vercel.
  
  const logPayload = {
    timestamp: new Date().toISOString(),
    type: 'AI_TELEMETRY',
    ...telemetry
  };

  if (telemetry.success) {
    console.info(JSON.stringify(logPayload));
  } else {
    console.error(JSON.stringify(logPayload));
  }
}
