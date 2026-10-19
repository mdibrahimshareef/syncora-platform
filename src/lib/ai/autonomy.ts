import { WorkflowPlan, RiskLevel } from './workflow-schema';
import { WorkspaceAIPolicy } from './governance';
import crypto from 'crypto';

export type AutonomyLevel = 0 | 1 | 2 | 3;

export const AUTONOMY_LEVELS = {
  ADVISORY: 0 as AutonomyLevel,
  PREPARE_AND_REQUEST_APPROVAL: 1 as AutonomyLevel,
  BOUNDED_AUTOMATIC: 2 as AutonomyLevel,
  RESTRICTED_HIGH_IMPACT: 3 as AutonomyLevel
};

export interface AutonomyPolicyBounds {
  maxActions: number;
  maxRetries: number;
  maxDurationMs: number;
}

export interface AutonomyDecision {
  allowed: boolean;
  effectiveLevel: AutonomyLevel;
  requiresApproval: boolean;
  reasonCodes: string[];
  bounds: AutonomyPolicyBounds;
  isAutonomousExecutionPermitted: boolean;
}

export interface EvaluateAutonomyInput {
  policy: WorkspaceAIPolicy;
  plan: WorkflowPlan;
  planRisk?: RiskLevel;
  userId?: string;
  isGlobalKillSwitchActive?: boolean;
}

/**
 * Standard allowlist of low-risk, deterministic actions eligible for bounded automatic execution (Level 2).
 * Destructive operations (delete, archive, permission mutations) are STRICTLY excluded.
 */
export const DEFAULT_ALLOWED_AUTONOMOUS_ACTIONS: readonly string[] = [
  'update_task'
];

/**
 * Evaluates whether a proposed workflow plan can execute autonomously (Level 2)
 * or if it must require human approval (Level 1) or be rejected (Level 0 / Policy Violation).
 *
 * Evaluation Precedence:
 * 1. Global / Workspace Kill Switch -> Fails closed immediately (Level 0).
 * 2. Workspace AI Disabled -> Blocked (Level 0).
 * 3. High Risk Plan -> Always requires approval (Level 1) or blocked if prohibited.
 * 4. Policy Autonomy Level < 2 -> Requires human approval (Level 1).
 * 5. Actions not in allowed_autonomous_actions -> Requires human approval (Level 1).
 * 6. Step count exceeds max_autonomous_actions_per_workflow -> Requires human approval (Level 1).
 * 7. When all criteria pass -> Bounded automatic execution permitted (Level 2).
 */
export function evaluateAutonomyDecision(
  inputOrPolicy: EvaluateAutonomyInput | WorkspaceAIPolicy,
  maybePlan?: WorkflowPlan,
  maybePlanRisk?: RiskLevel
): AutonomyDecision {
  let policy: WorkspaceAIPolicy;
  let plan: WorkflowPlan;
  let planRisk: RiskLevel;
  let isGlobalKillSwitchActive: boolean | undefined;

  if (inputOrPolicy && 'policy' in inputOrPolicy && 'plan' in inputOrPolicy) {
    const input = inputOrPolicy as EvaluateAutonomyInput;
    policy = input.policy;
    plan = input.plan;
    planRisk = input.planRisk || 'LOW';
    isGlobalKillSwitchActive = input.isGlobalKillSwitchActive;
  } else {
    policy = inputOrPolicy as WorkspaceAIPolicy;
    plan = maybePlan || { title: 'Workflow', description: '', steps: [] };
    planRisk = maybePlanRisk || 'LOW';
  }

  const reasonCodes: string[] = [];

  const defaultBounds: AutonomyPolicyBounds = {
    maxActions: policy?.max_workflow_steps || 5,
    maxRetries: 3,
    maxDurationMs: 15 * 60 * 1000 // 15 minutes hard timeout
  };

  // 1. Kill Switch Check (Fail-closed)
  const isKillSwitchActive = Boolean(
    isGlobalKillSwitchActive ||
    (policy as Record<string, unknown>).kill_switch_active ||
    process.env.AI_AUTONOMY_KILL_SWITCH === 'true'
  );

  if (isKillSwitchActive) {
    reasonCodes.push('KILL_SWITCH_ACTIVE');
    return {
      allowed: false,
      effectiveLevel: AUTONOMY_LEVELS.ADVISORY,
      requiresApproval: true,
      reasonCodes,
      bounds: defaultBounds,
      isAutonomousExecutionPermitted: false
    };
  }

  // 2. Base AI Policy Enabled Check
  if (!policy.ai_enabled) {
    reasonCodes.push('AI_DISABLED_FOR_WORKSPACE');
    return {
      allowed: false,
      effectiveLevel: AUTONOMY_LEVELS.ADVISORY,
      requiresApproval: true,
      reasonCodes,
      bounds: defaultBounds,
      isAutonomousExecutionPermitted: false
    };
  }

  // 3. Determine configured workspace autonomy level (defaults conservatively to Level 1)
  const configuredLevel: AutonomyLevel = typeof (policy as Record<string, unknown>).autonomy_level === 'number'
    ? ((policy as Record<string, unknown>).autonomy_level as AutonomyLevel)
    : AUTONOMY_LEVELS.PREPARE_AND_REQUEST_APPROVAL;

  // 4. Strict action allowlist for Level 2
  const allowedAutonomousActions: string[] = Array.isArray((policy as Record<string, unknown>).allowed_autonomous_actions)
    ? ((policy as Record<string, unknown>).allowed_autonomous_actions as string[])
    : [...DEFAULT_ALLOWED_AUTONOMOUS_ACTIONS];

  const maxAutonomousActions: number = typeof (policy as Record<string, unknown>).max_autonomous_actions_per_workflow === 'number'
    ? Number((policy as Record<string, unknown>).max_autonomous_actions_per_workflow)
    : 3;

  // Level 0: Advisory only
  if (configuredLevel === AUTONOMY_LEVELS.ADVISORY) {
    reasonCodes.push('WORKSPACE_AUTONOMY_LEVEL_0_ADVISORY_ONLY');
    return {
      allowed: true,
      effectiveLevel: AUTONOMY_LEVELS.ADVISORY,
      requiresApproval: true,
      reasonCodes,
      bounds: defaultBounds,
      isAutonomousExecutionPermitted: false
    };
  }

  // Check Plan Step Count against autonomous ceiling
  if (plan.steps.length > maxAutonomousActions) {
    reasonCodes.push(`PLAN_STEPS_EXCEED_AUTONOMOUS_CAP_${maxAutonomousActions}`);
  }

  // Check Plan Risk: HIGH risk plans always require approval regardless of configured autonomy
  if (planRisk === 'HIGH') {
    reasonCodes.push('HIGH_RISK_REQUIRES_HUMAN_APPROVAL');
  }

  // Check individual step tool allowlist and tool-specific policy flags
  for (const step of plan.steps) {
    if (!allowedAutonomousActions.includes(step.tool)) {
      reasonCodes.push(`TOOL_NOT_IN_AUTONOMOUS_ALLOWLIST_${step.tool}`);
    }

    if (step.tool === 'create_task' && !policy.allow_ai_task_creation) {
      reasonCodes.push('TASK_CREATION_DISABLED_BY_POLICY');
    }
    if (step.tool === 'update_task' && !policy.allow_ai_task_updates) {
      reasonCodes.push('TASK_UPDATES_DISABLED_BY_POLICY');
    }
    if (step.tool === 'assign_task' && !policy.allow_ai_task_assignment) {
      reasonCodes.push('TASK_ASSIGNMENT_DISABLED_BY_POLICY');
    }
  }

  // If workspace requires manual approval for all actions (enforced below Level 2)
  if (policy.require_action_approval && configuredLevel < AUTONOMY_LEVELS.BOUNDED_AUTOMATIC) {
    reasonCodes.push('POLICY_MANDATES_ACTION_APPROVAL');
  }

  // Autonomy Level Decision
  const canExecuteAutonomously =
    configuredLevel >= AUTONOMY_LEVELS.BOUNDED_AUTOMATIC &&
    reasonCodes.length === 0;

  if (canExecuteAutonomously) {
    return {
      allowed: true,
      effectiveLevel: AUTONOMY_LEVELS.BOUNDED_AUTOMATIC,
      requiresApproval: false,
      reasonCodes: ['ELIGIBLE_FOR_BOUNDED_AUTOMATIC_EXECUTION'],
      bounds: {
        maxActions: Math.min(defaultBounds.maxActions, maxAutonomousActions),
        maxRetries: 2,
        maxDurationMs: 5 * 60 * 1000 // 5 minutes for autonomous execution
      },
      isAutonomousExecutionPermitted: true
    };
  }

  // Level 1 Fallback: Valid for execution after human approval
  return {
    allowed: true,
    effectiveLevel: AUTONOMY_LEVELS.PREPARE_AND_REQUEST_APPROVAL,
    requiresApproval: true,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['REQUIRES_HUMAN_APPROVAL'],
    bounds: defaultBounds,
    isAutonomousExecutionPermitted: false
  };
}

/**
 * Computes a deterministic canonical SHA-256 hash digest of a WorkflowPlan.
 * This guarantees plan immutability: any modification to step IDs, tools,
 * arguments, or dependencies between proposal and execution invalidates approval.
 */
export function computePlanDigest(plan: WorkflowPlan): string {
  const canonicalSteps = plan.steps.map(step => ({
    stepId: step.stepId,
    tool: step.tool,
    args: step.args,
    dependsOn: [...(step.dependsOn || [])].sort()
  }));

  const payload = JSON.stringify({
    title: plan.title,
    steps: canonicalSteps
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}
