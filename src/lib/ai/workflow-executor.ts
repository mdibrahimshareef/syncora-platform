import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowPlan, WorkflowState } from './workflow-schema';
import { calculatePlanRisk } from './risk';
import { executeAction, ActionExecutionResult } from './action-executor';
import { publishWorkflowEvent, updateWorkflowState } from './workflow-events';
import { validateAIRequest, recordAIUsage } from './governance';

export type WorkflowExecutionResult = {
  status: WorkflowState;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
};

export async function executeWorkflowPlan(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  plan: WorkflowPlan
): Promise<WorkflowExecutionResult> {
  const planId = plan.workflowId || crypto.randomUUID();
  const executorId = crypto.randomUUID();
  
  try {
    const policy = await validateAIRequest(supabase, workspaceId, userId, 'workflow_execute');
    const risk = calculatePlanRisk(plan);
    
    // Check if workflow exists, otherwise create it
    const { data: existingWorkflow } = await supabase.from('ai_workflows').select('id').eq('id', planId).single();
    if (!existingWorkflow) {
      await supabase.from('ai_workflows').insert({
        id: planId,
        workspace_id: workspaceId,
        user_id: userId,
        title: plan.title,
        description: plan.description,
        plan: plan,
        status: 'PENDING',
        risk_level: risk
      });
    }

    // Claim lease
    const { data: leaseData, error: leaseError } = await supabase
      .from('ai_workflows')
      .update({ 
         status: 'EXECUTING', 
         executor_id: executorId,
         lease_expires_at: new Date(Date.now() + 2 * 60000).toISOString(),
         timeout_at: new Date(Date.now() + 15 * 60000).toISOString() // 15 min hard timeout
      })
      .eq('id', planId)
      .select()
      .single();

    if (leaseError || !leaseData) {
       throw new Error('Failed to acquire execution lease. Another process may be running.');
    }

    await publishWorkflowEvent(supabase, {
      workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_STARTED', status: 'EXECUTING'
    });

    const completedSteps = new Set<string>();

    for (const step of plan.steps) {
      // 1.5 Check if workflow was cancelled mid-flight, or if lease/timeout expired
      const { data: currentWorkflow } = await supabase.from('ai_workflows').select('status, timeout_at, executor_id').eq('id', planId).single();
      
      if (currentWorkflow?.executor_id !== executorId) {
        throw new Error('Execution lease was lost or hijacked.');
      }

      if (currentWorkflow?.status === 'CANCELLED' || currentWorkflow?.status === 'CANCELLATION_REQUESTED') {
         await updateWorkflowState(supabase, planId, workspaceId, userId, 'CANCELLED');
         await publishWorkflowEvent(supabase, {
           workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_CANCELLED', status: 'CANCELLED', metadata: { reason: 'Cancelled during execution' }
         });
         return { status: 'CANCELLED', completedSteps: Array.from(completedSteps), error: 'Workflow was cancelled.' };
      }

      if (currentWorkflow?.timeout_at && new Date() > new Date(currentWorkflow.timeout_at)) {
         const finalStatus = 'PARTIALLY_COMPLETED';
         await updateWorkflowState(supabase, planId, workspaceId, userId, finalStatus);
         await publishWorkflowEvent(supabase, {
           workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_PAUSED', status: finalStatus, metadata: { error: 'Workflow hard timeout exceeded.' }
         });
         return { status: finalStatus, completedSteps: Array.from(completedSteps), error: 'Workflow hard timeout exceeded.' };
      }

      // Bump lease for next step
      await supabase.from('ai_workflows').update({ lease_expires_at: new Date(Date.now() + 2 * 60000).toISOString() }).eq('id', planId);

      // 2. Validate dependencies
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!completedSteps.has(dep)) {
             await publishWorkflowEvent(supabase, {
                workflowId: planId, stepId: step.stepId, workspaceId, userId, 
                eventType: 'STEP_FAILED', status: 'FAILED', metadata: { error: `Dependency ${dep} not completed` }
             });
             const finalStatus = 'PARTIALLY_COMPLETED';
             await updateWorkflowState(supabase, planId, workspaceId, userId, finalStatus);
             await publishWorkflowEvent(supabase, {
                workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_PARTIALLY_COMPLETED', status: finalStatus
             });
             return { status: finalStatus, completedSteps: Array.from(completedSteps), failedStep: step.stepId, error: `Dependency ${dep} was not completed.` };
          }
        }
      }

      // 3. Idempotency Check
      const actionId = `${planId}-${step.stepId}`;
      const { data: existingAction } = await supabase.from('ai_action_logs').select('*').eq('action_id', actionId).single();
      
      if (existingAction && existingAction.status === 'completed') {
        completedSteps.add(step.stepId);
        await publishWorkflowEvent(supabase, {
          workflowId: planId, stepId: step.stepId, workspaceId, userId, eventType: 'STEP_SKIPPED', status: 'SKIPPED', metadata: { reason: 'Already completed' }
        });
        continue;
      }
      
      if (!existingAction) {
        await supabase.from('ai_action_logs').insert({
          action_id: actionId, workspace_id: workspaceId, user_id: userId, action_type: step.tool, status: 'pending', payload: step.args
        });
      }

      await publishWorkflowEvent(supabase, {
        workflowId: planId, stepId: step.stepId, workspaceId, userId, eventType: 'STEP_STARTED', status: 'EXECUTING'
      });

      // 4. Execute Step & Verify Step
      const result: ActionExecutionResult = await executeAction(
        supabase, workspaceId, userId, step.tool, step.args
      );

      // 5. Update Action Log
      await supabase.from('ai_action_logs').update({
        status: result.status === 'executed_but_not_verified' ? 'completed' : result.status,
        result: result.status === 'executed_but_not_verified' ? { ...result.data, __verificationWarning: result.error } : ('data' in result ? result.data : result),
        completed_at: new Date().toISOString()
      }).eq('action_id', actionId);

      // 6. Handle failure
      if (result.status === 'failed' || result.status === 'denied' || result.status === 'conflict') {
        const errorMsg = result.status === 'conflict' ? (result as any).message : (result as any).error;
        await publishWorkflowEvent(supabase, {
          workflowId: planId, stepId: step.stepId, workspaceId, userId, eventType: 'STEP_FAILED', status: 'FAILED', metadata: { error: errorMsg }
        });
        const finalStatus = 'PARTIALLY_COMPLETED';
        await updateWorkflowState(supabase, planId, workspaceId, userId, finalStatus);
        await publishWorkflowEvent(supabase, {
          workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_PARTIALLY_COMPLETED', status: finalStatus
        });
        return { status: finalStatus, completedSteps: Array.from(completedSteps), failedStep: step.stepId, error: errorMsg };
      }
      
      if (result.status === 'executed_but_not_verified') {
        const errorMsg = (result as any).error;
        await publishWorkflowEvent(supabase, {
          workflowId: planId, stepId: step.stepId, workspaceId, userId, eventType: 'STEP_VERIFIED', status: 'VERIFICATION_FAILED', metadata: { error: errorMsg }
        });
        const finalStatus = 'VERIFICATION_FAILED';
        await updateWorkflowState(supabase, planId, workspaceId, userId, finalStatus);
        await publishWorkflowEvent(supabase, {
          workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_PARTIALLY_COMPLETED', status: finalStatus
        });
        return { status: finalStatus, completedSteps: Array.from(completedSteps), failedStep: step.stepId, error: errorMsg };
      }

      // Success
      await publishWorkflowEvent(supabase, {
        workflowId: planId, stepId: step.stepId, workspaceId, userId, eventType: 'STEP_COMPLETED', status: 'COMPLETED'
      });
      completedSteps.add(step.stepId);
    }

    const finalStatus = 'COMPLETED';
    await supabase.from('ai_workflows').update({ status: finalStatus, completed_at: new Date().toISOString(), executor_id: null }).eq('id', planId);
    await publishWorkflowEvent(supabase, {
      workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_COMPLETED', status: finalStatus
    });

    await recordAIUsage(supabase, workspaceId, userId, { requestType: 'workflow_execute' });

    return { status: finalStatus, completedSteps: Array.from(completedSteps) };

  } catch (error: any) {
    if (error.name === 'AIGovernanceError') {
      throw error;
    }
    const errorMsg = error.message || 'Unexpected workflow execution failure';
    await supabase.from('ai_workflows').update({ status: 'FAILED', executor_id: null }).eq('id', planId);
    await publishWorkflowEvent(supabase, {
      workflowId: planId, workspaceId, userId, eventType: 'WORKFLOW_PAUSED', status: 'FAILED', metadata: { error: errorMsg }
    });
    return { status: 'FAILED', completedSteps: [], error: errorMsg };
  }
}

export async function resumeWorkflowPlan(
  supabase: SupabaseClient,
  workflowId: string,
  workspaceId: string,
  userId: string
): Promise<WorkflowExecutionResult> {
  const { data: workflow, error } = await supabase.from('ai_workflows').select('*').eq('id', workflowId).eq('workspace_id', workspaceId).single();
  
  if (error || !workflow) {
    throw new Error('Workflow not found or access denied');
  }

  if (['COMPLETED', 'CANCELLED', 'EXECUTING', 'VERIFYING'].includes(workflow.status)) {
    // If it says EXECUTING, check lease. If lease is expired, we can actually resume!
    if (workflow.status === 'EXECUTING' && workflow.lease_expires_at && new Date() > new Date(workflow.lease_expires_at)) {
      // Lease expired, allow resume to take over
    } else {
      throw new Error(`Cannot resume workflow in ${workflow.status} state`);
    }
  }

  await validateAIRequest(supabase, workspaceId, userId, 'workflow_resume');

  // Concurrency lock (Atomic transition)
  const { data: updatedWorkflow, error: updateError } = await supabase
    .from('ai_workflows')
    .update({ status: 'RECOVERING' })
    .eq('id', workflowId)
    .in('status', ['FAILED', 'VERIFICATION_FAILED', 'PARTIALLY_COMPLETED', 'PAUSED', 'EXECUTING'])
    .select()
    .single();

  if (updateError || !updatedWorkflow) {
    throw new Error('Workflow is currently executing or state changed. Cannot resume.');
  }

  await publishWorkflowEvent(supabase, {
    workflowId, workspaceId, userId, eventType: 'WORKFLOW_RESUMED', status: 'RECOVERING'
  });

  // Delegate to existing executor which inherently supports idempotency/skipping
  return executeWorkflowPlan(supabase, workspaceId, userId, workflow.plan);
}

export async function cancelWorkflowPlan(
  supabase: SupabaseClient,
  workflowId: string,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { data: workflow, error } = await supabase.from('ai_workflows').select('*').eq('id', workflowId).eq('workspace_id', workspaceId).single();
  
  if (error || !workflow) {
    throw new Error('Workflow not found or access denied');
  }

  if (['COMPLETED', 'CANCELLED'].includes(workflow.status)) {
    return; // Already terminal
  }

  // Concurrency lock (Atomic transition)
  const { data: updatedWorkflow, error: updateError } = await supabase
    .from('ai_workflows')
    .update({ status: 'CANCELLED' })
    .eq('id', workflowId)
    .neq('status', 'COMPLETED')
    .neq('status', 'CANCELLED')
    .select()
    .single();

  if (updateError || !updatedWorkflow) {
    throw new Error('Could not cancel workflow. State may have already changed.');
  }

  await publishWorkflowEvent(supabase, {
    workflowId, workspaceId, userId, eventType: 'WORKFLOW_CANCELLED', status: 'CANCELLED'
  });
}

export async function retryWorkflowStep(
  supabase: SupabaseClient,
  workflowId: string,
  stepId: string,
  workspaceId: string,
  userId: string
): Promise<WorkflowExecutionResult> {
  // 1. Verify workflow authorization
  const { data: workflow, error } = await supabase.from('ai_workflows').select('*').eq('id', workflowId).eq('workspace_id', workspaceId).single();
  
  if (error || !workflow) {
    throw new Error('Workflow not found or access denied');
  }

  if (['COMPLETED', 'CANCELLED'].includes(workflow.status)) {
    throw new Error(`Cannot retry step in ${workflow.status} state`);
  }

  await validateAIRequest(supabase, workspaceId, userId, 'workflow_retry');

  // Concurrency lock (Atomic transition)
  const { data: updatedWorkflow, error: updateError } = await supabase
    .from('ai_workflows')
    .update({ status: 'RECOVERING' })
    .eq('id', workflowId)
    .in('status', ['FAILED', 'VERIFICATION_FAILED', 'PARTIALLY_COMPLETED', 'PAUSED'])
    .select()
    .single();

  if (updateError || !updatedWorkflow) {
    throw new Error('Workflow is currently executing or state changed. Cannot retry step.');
  }

  // 2. Verify step exists in plan
  const step = workflow.plan.steps.find((s: any) => s.stepId === stepId);
  if (!step) {
    throw new Error('Step not found in workflow plan');
  }

  // 3. Verify previous execution state from ai_action_logs
  const actionId = `${workflowId}-${stepId}`;
  const { data: existingAction } = await supabase.from('ai_action_logs').select('*').eq('action_id', actionId).single();
  
  if (existingAction && ['completed', 'COMPLETED'].includes(existingAction.status)) {
    throw new Error('Step is already completed and cannot be retried');
  }

  await publishWorkflowEvent(supabase, {
    workflowId, stepId, workspaceId, userId, eventType: 'STEP_RETRYING', status: 'RECOVERING'
  });

  // Since we want to resume the workflow from this point (and complete the rest of the plan),
  // we delegate to resumeWorkflowPlan now that concurrency is acquired and step is validated.
  return executeWorkflowPlan(supabase, workspaceId, userId, workflow.plan);
}

