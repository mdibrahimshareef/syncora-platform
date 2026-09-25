import { SyncoraEvent } from '../integrations/types';
import { 
  TriggerType, 
  ConditionOperator, 
  ConditionField, 
  ActionType 
} from './registry';

// Internal Execution Context passed through the engine
export interface AutomationExecutionContext {
  workspaceId: string;
  automationId: string;
  automationVersion: number;
  rootEventId: string;
  executionId: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  depth: number;
  event: SyncoraEvent;
}

// Database representations
export type AutomationStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED';

export interface AutomationTriggerConfig {
  type: TriggerType;
  config: Record<string, any>;
}

export interface AutomationConditionRule {
  field: ConditionField;
  operator: ConditionOperator;
  value: any;
}

export interface AutomationConditionGroup {
  operator: 'AND' | 'OR';
  rules: (AutomationConditionRule | AutomationConditionGroup)[];
}

export interface AutomationActionConfig {
  id: string; // Unique ID within the automation for sequencing logs
  type: ActionType;
  config: Record<string, any>;
}

export interface AutomationRecord {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  version: number;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  conditions?: AutomationConditionGroup;
  actions: AutomationActionConfig[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type AutomationRunStatus = 'running' | 'completed' | 'partially_failed' | 'failed' | 'skipped';

export interface AutomationRunRecord {
  id: string;
  automation_id: string;
  automation_version: number;
  workspace_id: string;
  status: AutomationRunStatus;
  root_event_id: string;
  triggered_by?: string;
  entity_type: string;
  entity_id: string;
  execution_depth: number;
  error_message?: string;
  executed_at: string;
  completed_at?: string;
}

export interface AutomationActionLogRecord {
  id: string;
  run_id: string;
  automation_id: string;
  workspace_id: string;
  action_id: string; // Refers to the ID inside AutomationActionConfig
  action_type: ActionType;
  status: 'Success' | 'Failed';
  error_message?: string;
  started_at: string;
  completed_at: string;
}
