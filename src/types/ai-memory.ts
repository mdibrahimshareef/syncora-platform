export type MemoryScope = 'workspace' | 'user';

export type MemoryCategory =
  | 'goal_priority'
  | 'project_objective'
  | 'decision_rationale'
  | 'recurring_blocker'
  | 'historical_outcome'
  | 'working_agreement'
  | 'user_preference'
  | 'milestone_lesson'
  | 'operational_pattern'
  | 'risk_resolution';

export type MemorySourceType =
  | 'explicit_user'
  | 'decision_record'
  | 'workflow_outcome'
  | 'conversation_extraction'
  | 'meeting_notes'
  | 'system_observation';

export type MemoryVerificationStatus =
  | 'unverified'
  | 'confirmed'
  | 'inferred'
  | 'disputed';

export type MemoryLifecycleStatus =
  | 'active'
  | 'superseded'
  | 'archived'
  | 'expired';

export interface AIMemoryRecord {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  summary?: string | null;
  attributes: Record<string, unknown>;
  source_type: MemorySourceType;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  evidence: Array<{
    quote?: string;
    sourceId?: string;
    sourceType?: string;
    timestamp?: string;
    url?: string;
  }>;
  confidence: number;
  verification_status: MemoryVerificationStatus;
  lifecycle_status: MemoryLifecycleStatus;
  superseded_by?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_reviewed_at?: string | null;
  expires_at?: string | null;
  provenance: {
    extractionReason?: string;
    authorRole?: string;
    conversationId?: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

export interface CreateMemoryInput {
  workspaceId: string;
  userId?: string | null;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  summary?: string;
  attributes?: Record<string, unknown>;
  sourceType: MemorySourceType;
  sourceEntityType?: string;
  sourceEntityId?: string;
  evidence?: Array<{
    quote?: string;
    sourceId?: string;
    sourceType?: string;
    timestamp?: string;
    url?: string;
  }>;
  confidence?: number;
  verificationStatus?: MemoryVerificationStatus;
  expiresAt?: string;
  provenance?: Record<string, unknown>;
}

export interface DecisionOutcomeRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  recommendation_id: string;
  recommendation_type: string;
  decision_context: {
    situation: string;
    constraints?: string[];
    options: Array<{
      id: string;
      title: string;
      tradeOffs?: string;
    }>;
    recommendedOptionId?: string;
  };
  user_action: 'accepted' | 'rejected' | 'modified' | 'ignored';
  rejection_reason?: string | null;
  modification_details?: Record<string, unknown> | null;
  workflow_id?: string | null;
  action_result: 'pending' | 'executed_verified' | 'executed_unverified' | 'failed' | 'skipped';
  observed_outcome: 'positive' | 'negative' | 'neutral' | 'pending_observation';
  outcome_notes?: string | null;
  feedback_score?: number | null;
  created_at: string;
  updated_at: string;
  evaluated_at?: string | null;
}
