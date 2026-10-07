export type AIJobType = 'EVENT_TRIGGERED' | 'SCHEDULED' | 'PROACTIVE';
export type AIJobStatus = 'QUEUED' | 'CLAIMED' | 'RUNNING' | 'WAITING_APPROVAL' | 'RECOVERY_PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface AIJob {
  id: string;
  workspace_id: string;
  user_id: string;
  workflow_id: string | null;
  job_type: AIJobType;
  trigger_type: string;
  payload: Record<string, any> | null;
  status: AIJobStatus;
  priority: number;
  executor_id: string | null;
  attempt_count: number;
  max_attempts: number;
  scheduled_at: string;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AIInsightType = 'NEEDS_ATTENTION' | 'PROJECT_AT_RISK' | 'SUGGESTED_NEXT' | 'WORKLOAD_RISK' | 'DEADLINE_RISK';

export interface AIInsight {
  id: string;
  workspace_id: string;
  type: AIInsightType;
  entity_type: string;
  entity_id: string;
  content: string;
  action_proposed: Record<string, any> | null;
  confidence: number | null;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
