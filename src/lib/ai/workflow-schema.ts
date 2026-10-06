import { z } from 'zod';

export const WorkflowStateSchema = z.enum([
  'PLANNING',
  'AWAITING_APPROVAL',
  'EXECUTING',
  'VERIFYING',
  'PAUSED',
  'RECOVERING',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'CANCELLED',
  'CANCELLATION_REQUESTED',
  'FAILED',
  'VERIFICATION_FAILED'
]);
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const WorkflowStepSchema = z.object({
  stepId: z.string().min(1),
  tool: z.string().min(1),
  args: z.record(z.any()), // Tool-specific arguments
  dependsOn: z.array(z.string()).optional(),
  expectedState: z.record(z.any()).optional(), // Expected state for verification/stale-checks
  risk: RiskLevelSchema.optional() // Supplied by LLM, but will be overwritten by server
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowPlanSchema = z.object({
  workflowId: z.string().uuid().optional(),
  title: z.string(),
  description: z.string(),
  steps: z.array(WorkflowStepSchema)
    .min(1, 'Workflow must have at least 1 step.')
    .max(5, 'Workflow cannot exceed 5 steps.')
    .refine((steps) => {
      const ids = new Set();
      for (const step of steps) {
        if (ids.has(step.stepId)) return false;
        ids.add(step.stepId);
      }
      return true;
    }, { message: 'Duplicate step IDs are not allowed.' })
    .refine((steps) => {
      // Validate dependencies
      const ids = new Set(steps.map(s => s.stepId));
      for (const step of steps) {
        if (step.dependsOn) {
          for (const dep of step.dependsOn) {
            if (!ids.has(dep)) return false; // Dependency doesn't exist in plan
            if (dep === step.stepId) return false; // Self-dependency
          }
        }
      }
      return true;
    }, { message: 'Invalid or cyclic dependencies detected.' })
});
export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;
