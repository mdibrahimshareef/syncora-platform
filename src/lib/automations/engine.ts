import { createClient } from '@/lib/supabase/server';
import { SyncoraEvent } from '../integrations/types';
import { 
  AutomationRecord, 
  AutomationExecutionContext, 
  AutomationConditionGroup, 
  AutomationActionConfig 
} from './types';
import { processWebhookDelivery } from '../webhooks/delivery';
import { dispatchEvent } from '../events/dispatcher';
import * as taskApi from '../api/tasks';

const MAX_EXECUTION_DEPTH = 5; // Loop protection

export async function processEventForAutomations(event: SyncoraEvent, depth = 1) {
  if (depth > MAX_EXECUTION_DEPTH) {
    console.warn(`[Automation Engine] Max depth ${MAX_EXECUTION_DEPTH} reached for event ${event.id}. Aborting to prevent infinite loop.`);
    return;
  }

  const supabase = await createClient();

  // 1. Fetch active automations for the workspace
  const { data: automationsData, error } = await (supabase as any)
    .from('automations')
    .select('*')
    .eq('workspace_id', event.workspaceId)
    .eq('status', 'PUBLISHED');

  if (error || !automationsData || automationsData.length === 0) {
    return;
  }

  const automations = automationsData as AutomationRecord[];

  for (const automation of automations) {
    // 2. Evaluate Trigger
    if (!evaluateTrigger(automation, event)) continue;

    // 3. Evaluate Conditions
    if (!evaluateConditions(automation.conditions, event)) continue;

    // 4. Create Run Record (Pending)
    const { data: runRecord } = await (supabase as any)
      .from('automation_runs')
      .insert({
        automation_id: automation.id,
        automation_version: automation.version,
        workspace_id: event.workspaceId,
        status: 'running',
        root_event_id: event.id,
        entity_type: event.type.split('.')[0],
        entity_id: event.payload.id || event.payload.taskId || event.payload.projectId || null,
        execution_depth: depth,
        triggered_by: event.actorId || null
      })
      .select('id')
      .single();

    if (!runRecord) continue;

    // 5. Execute Actions Sequentially
    let hasFailure = false;
    let i = 0;
    
    for (const action of automation.actions) {
      const actionStartedAt = new Date().toISOString();
      let actionSuccess = false;
      let actionErrorMsg = '';

      try {
        await executeAction(action, event, supabase, depth);
        actionSuccess = true;
      } catch (err: any) {
        hasFailure = true;
        actionSuccess = false;
        actionErrorMsg = err.message || String(err);
        console.error(`[Automation Engine] Action failed:`, err);
      }

      // Record Action Log
      await (supabase as any).from('automation_action_logs').insert({
        run_id: runRecord.id,
        automation_id: automation.id,
        workspace_id: event.workspaceId,
        action_id: action.id || `action-${i}`,
        action_type: action.type,
        status: actionSuccess ? 'Success' : 'Failed',
        error_message: actionErrorMsg || null,
        started_at: actionStartedAt,
        completed_at: new Date().toISOString()
      });

      i++;
      // Stop executing further actions if one fails (fail-fast)
      if (hasFailure) break;
    }

    // 6. Update Run Status
    await (supabase as any).from('automation_runs')
      .update({
        status: hasFailure ? 'failed' : 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', runRecord.id);
  }
}

function evaluateTrigger(automation: AutomationRecord, event: SyncoraEvent): boolean {
  if (automation.trigger_type !== event.type) return false;
  
  // Custom logic for status change triggers (target status check)
  if (automation.trigger_type === 'task.status_changed') {
    const targetStatus = automation.trigger_config?.targetStatus;
    if (targetStatus && event.payload.newStatus !== targetStatus) {
      return false;
    }
  }
  
  return true;
}

function evaluateConditions(conditions: AutomationConditionGroup | undefined, event: SyncoraEvent): boolean {
  if (!conditions || !conditions.rules || conditions.rules.length === 0) {
    return true; // No conditions = always run
  }
  
  // A robust condition evaluator is needed here. For Phase 14, we will assume true if rules exist
  // until the visual condition builder passes the exact JSON structure.
  // In a full implementation, we'd recursively evaluate `AND`/`OR` groups against `event.payload`.
  return true; 
}

async function executeAction(action: AutomationActionConfig, event: SyncoraEvent, supabase: any, depth: number) {
  const { type, config } = action;

  switch (type) {
    case 'task.assign': {
      if (!config.userId || !event.payload.taskId) throw new Error('Missing userId or taskId');
      
      const updatedTask = await taskApi.updateTask(supabase, event.payload.taskId, { assigneeId: config.userId });
      
      const newEvent: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'task.assigned',
        workspaceId: event.workspaceId,
        timestamp: new Date().toISOString(),
        actorId: 'system-automation',
        payload: { task: updatedTask, assigneeId: config.userId }
      };
      
      // Dispatch the new event with depth + 1 for loop protection
      await dispatchEvent(newEvent, depth + 1);
      
      break;
    }
    case 'task.set_status': {
      if (!config.status || !event.payload.taskId) throw new Error('Missing status or taskId');
      
      const oldTask = await supabase.from('tasks').select('status').eq('id', event.payload.taskId).single();
      const updatedTask = await taskApi.updateTask(supabase, event.payload.taskId, { status: config.status });
      
      const newEvent: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'task.status_changed',
        workspaceId: event.workspaceId,
        timestamp: new Date().toISOString(),
        actorId: 'system-automation',
        payload: { task: updatedTask, previousStatus: oldTask?.data?.status, newStatus: config.status }
      };
      
      await dispatchEvent(newEvent, depth + 1);
      break;
    }
    case 'task.set_priority': {
      if (!config.priority || !event.payload.taskId) throw new Error('Missing priority or taskId');
      
      const updatedTask = await taskApi.updateTask(supabase, event.payload.taskId, { priority: config.priority });
      
      const newEvent: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'task.updated',
        workspaceId: event.workspaceId,
        timestamp: new Date().toISOString(),
        actorId: 'system-automation',
        payload: { task: updatedTask }
      };
      
      await dispatchEvent(newEvent, depth + 1);
      break;
    }
    case 'notify.user': {
      if (!config.userId) throw new Error('Missing userId for notification');
      const { error } = await supabase.from('notifications')
        .insert({
          user_id: config.userId,
          workspace_id: event.workspaceId,
          type: 'SYSTEM',
          title: 'Automation Triggered',
          message: config.message || `Automated message.`,
          link: `/projects/${event.payload.projectId || ''}`,
          is_read: false
        });
      if (error) throw error;
      break;
    }
    case 'task.create': {
      if (!config.title || !event.payload.projectId) throw new Error('Missing title or projectId');
      
      const createdTask = await taskApi.createTask(supabase, event.payload.projectId, {
          title: config.title,
          description: config.description || null,
          status: 'To Do',
          priority: 'Medium',
          workspaceId: event.workspaceId,
          parentId: event.payload.taskId || null,
          userId: 'system-automation'
      });

      const newEvent: SyncoraEvent = {
        id: crypto.randomUUID(),
        type: 'task.created',
        workspaceId: event.workspaceId,
        timestamp: new Date().toISOString(),
        actorId: 'system-automation',
        payload: { task: createdTask }
      };
      
      await dispatchEvent(newEvent, depth + 1);
      
      break;
    }
    case 'webhook.send': {
      if (!config.endpointId) throw new Error('Missing webhook endpointId');
      
      // 1. Create delivery record
      const { data: deliveryRecord, error: deliveryError } = await supabase
        .from('webhook_deliveries')
        .insert({
          endpoint_id: config.endpointId,
          workspace_id: event.workspaceId,
          event_id: event.id,
          event_type: event.type,
          status: 'pending',
          payload: event
        })
        .select('id')
        .single();
        
      if (deliveryError || !deliveryRecord) throw deliveryError || new Error('Failed to create delivery record');
      
      // 2. We can await it so that the automation log records its completion/failure
      // or we can fire and forget if we don't want the automation run to block.
      // To strictly follow Phase 14H constraints (no fake success, failure is visible),
      // we await the processing synchronously in this context.
      await processWebhookDelivery(deliveryRecord.id, event, 1);
      
      // Verify final status
      const { data: finalRecord } = await supabase
        .from('webhook_deliveries')
        .select('status, error')
        .eq('id', deliveryRecord.id)
        .single();
        
      if (finalRecord?.status !== 'delivered') {
        throw new Error(finalRecord?.error || 'Webhook delivery failed');
      }
      break;
    }
    default:
      throw new Error(`Unsupported action type: ${type}`);
  }
}
