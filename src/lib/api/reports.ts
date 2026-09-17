import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export async function getWorkspaceReportingSummary(supabase: SupabaseClient<Database>, workspaceId: string) {
  // We'll run a few parallel queries to aggregate our dashboard metrics
  const [
    { data: projects, error: projectsError },
    { data: tasks, error: tasksError }
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, health, budget, spent')
      .eq('workspace_id', workspaceId),
    supabase
      .from('tasks')
      .select('id, status, priority, sla_status, assignee_id, estimated_time, tracked_time')
      .in('project_id', (
        // Subquery trick locally isn't strictly necessary if we fetched projects above,
        // but since we want to be safe and fast, we can use the projects list.
        // For now, we'll fetch all tasks by joining project_id manually below.
        []
      ))
  ])

  // Since Supabase JS doesn't support complex inner joins with nested WHERE easily in one go without RPC,
  // we first get project IDs:
  if (projectsError) throw projectsError
  
  const projectIds = projects?.map(p => p.id) || []
  
  let allTasks: any[] = []
  if (projectIds.length > 0) {
    const { data: fetchedTasks, error: tError } = await supabase
      .from('tasks')
      .select('id, status, priority, sla_status, assignee_id, estimated_time, tracked_time')
      .in('project_id', projectIds)
      
    if (tError) throw tError
    allTasks = fetchedTasks || []
  }

  // Calculate Project Health Distribution
  const projectHealth = {
    onTrack: projects?.filter(p => p.health === 'On Track').length || 0,
    atRisk: projects?.filter(p => p.health === 'At Risk').length || 0,
    offTrack: projects?.filter(p => p.health === 'Off Track').length || 0,
  }

  // Calculate Budget
  const totalBudget = projects?.reduce((acc, p) => acc + Number(p.budget || 0), 0) || 0
  const totalSpent = projects?.reduce((acc, p) => acc + Number(p.spent || 0), 0) || 0

  // Calculate Task SLAs
  const taskSLAs = {
    onTrack: allTasks.filter(t => t.sla_status === 'On Track').length,
    atRisk: allTasks.filter(t => t.sla_status === 'At Risk').length,
    breached: allTasks.filter(t => t.sla_status === 'Breached').length,
  }

  // Calculate Task Completion (assuming 'Done' is the terminal state)
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'Done').length
  
  // Calculate Workload (unassigned vs assigned)
  const unassignedTasks = allTasks.filter(t => !t.assignee_id && t.status !== 'Done').length

  return {
    projects: {
      total: projects?.length || 0,
      health: projectHealth,
      financials: { budget: totalBudget, spent: totalSpent }
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      slas: taskSLAs,
      unassigned: unassignedTasks
    }
  }
}
