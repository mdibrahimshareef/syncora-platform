import { SupabaseClient } from '@supabase/supabase-js';
import { AIJob, AIInsight } from '../../types/ai-jobs';

/**
 * Phase 6: Proactive Work Intelligence
 * 
 * Uses deterministic signals first to find risks, then generates actionable insights.
 */
export async function runProactiveAnalysis(supabase: SupabaseClient, job: AIJob) {
  // 1. Deterministic signals
  const overdueTasks = await findOverdueTasks(supabase, job.workspace_id);
  const stalledProjects = await findStalledProjects(supabase, job.workspace_id);
  
  const newInsights: Omit<AIInsight, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Generate NEEDS_ATTENTION insights for overdue tasks
  for (const task of overdueTasks) {
    // Only generate insight if we haven't recently warned about this task
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('workspace_id', job.workspace_id)
      .eq('entity_type', 'task')
      .eq('entity_id', task.id)
      .eq('type', 'NEEDS_ATTENTION')
      .eq('is_dismissed', false)
      .single();

    if (!existing) {
      newInsights.push({
        workspace_id: job.workspace_id,
        type: 'NEEDS_ATTENTION',
        entity_type: 'task',
        entity_id: task.id,
        content: `Task "${task.title}" is overdue and requires immediate attention.`,
        action_proposed: {
          action: 'notify_assignee',
          assignee_id: task.assignee_id
        },
        confidence: 100,
        is_dismissed: false,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week expiry
      });
    }
  }

  // Generate PROJECT_AT_RISK insights
  for (const project of stalledProjects) {
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('workspace_id', job.workspace_id)
      .eq('entity_type', 'project')
      .eq('entity_id', project.id)
      .eq('type', 'PROJECT_AT_RISK')
      .eq('is_dismissed', false)
      .single();

    if (!existing) {
      newInsights.push({
        workspace_id: job.workspace_id,
        type: 'PROJECT_AT_RISK',
        entity_type: 'project',
        entity_id: project.id,
        content: `Project "${project.name}" has stalled. Consider revising deadlines or allocating more resources.`,
        action_proposed: {
          action: 'create_checkin_task',
          project_id: project.id
        },
        confidence: 85,
        is_dismissed: false,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() 
      });
    }
  }

  // 2. Insert new insights
  if (newInsights.length > 0) {
    const { error } = await supabase.from('ai_insights').insert(newInsights);
    if (error) {
      console.error('Failed to insert insights:', error);
      throw error;
    }
    
    // 3. Fire notification trigger for insights (Phase 7: AI Notifications)
    // To cleanly separate concerns, we insert into the 'notifications' table natively for new insights.
    const notifications = newInsights.map(insight => ({
      workspace_id: insight.workspace_id,
      recipient_id: job.user_id, // Or project owner/assignee in a real mapping
      actor_id: null, // System AI
      type: 'AI_INSIGHT',
      entity_type: insight.entity_type,
      entity_id: insight.entity_id,
      metadata: {
        insight_type: insight.type,
        message: insight.content
      }
    }));
    
    await supabase.from('notifications').insert(notifications);
  }
}

async function findOverdueTasks(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, assignee_id, due_date')
    .eq('workspace_id', workspaceId)
    .lt('due_date', new Date().toISOString())
    .neq('status', 'Completed')
    .limit(10);
    
  if (error) throw error;
  return data || [];
}

async function findStalledProjects(supabase: SupabaseClient, workspaceId: string) {
  // Simplified deterministic signal: Projects in progress but no task updates recently
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .neq('status', 'Completed')
    .limit(5);
    
  if (error) throw error;
  return data || [];
}
