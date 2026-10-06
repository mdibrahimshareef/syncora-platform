import { createClient } from '@/lib/supabase/server'
import { AISource, resolveSourceUrl } from './sources'

export type ProjectHealth = {
  status: 'Healthy' | 'At Risk' | 'Off Track' | 'Unknown';
  confidence: 'High' | 'Medium' | 'Low';
  keySignals: string[];
  risks: string[];
  blockers: string[];
  recommendations: string[];
}

export async function calculateProjectHealth(projectId: string, workspaceId: string): Promise<{ health: ProjectHealth, sources: AISource[] }> {
  const supabase = await createClient()

  // Fetch project details
  const { data: project, error: pError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('workspace_id', workspaceId)
    .single()

  if (pError || !project) {
    return {
      health: { status: 'Unknown', confidence: 'High', keySignals: ['Project not found'], risks: [], blockers: [], recommendations: [] },
      sources: []
    }
  }

  // Fetch all tasks for the project
  const { data: tasks, error: tError } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, assignee_id')
    .eq('project_id', projectId)
    .eq('workspace_id', workspaceId)

  if (tError || !tasks || tasks.length === 0) {
    return {
      health: { status: 'Unknown', confidence: 'High', keySignals: ['No tasks in project'], risks: [], blockers: [], recommendations: ['Add tasks to track progress.'] },
      sources: []
    }
  }

  const now = new Date().getTime()
  
  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'Done').length
  const blocked = tasks.filter(t => t.status === 'Blocked')
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date).getTime() < now && t.status !== 'Done')
  const unassigned = tasks.filter(t => !t.assignee_id && t.status !== 'Done')

  const signals: string[] = []
  const risks: string[] = []
  const blockersStr: string[] = blocked.map(b => `Task "${b.title}" is blocked.`)
  const recommendations: string[] = []

  signals.push(`${completed}/${total} tasks completed (${Math.round((completed/total)*100)}%).`)

  if (overdue.length > 0) {
    risks.push(`${overdue.length} tasks are overdue.`)
    recommendations.push('Reassign or reschedule overdue tasks.')
  }
  
  if (unassigned.length > 0) {
    risks.push(`${unassigned.length} active tasks are unassigned.`)
    recommendations.push('Assign owners to unassigned tasks.')
  }

  if (blocked.length > 0) {
    recommendations.push('Investigate and resolve blocked tasks immediately.')
  }

  let status: 'Healthy' | 'At Risk' | 'Off Track' = 'Healthy'
  
  if (blocked.length > 0 || (overdue.length / total) > 0.2) {
    status = 'At Risk'
  }
  if ((overdue.length / total) > 0.5) {
    status = 'Off Track'
  }

  // Generate source references for the project
  const projectUrl = await resolveSourceUrl(workspaceId, 'project', projectId)
  const sources: AISource[] = [{
    id: `project-${projectId}`,
    entityId: projectId,
    type: 'project',
    title: project.name,
    workspaceId,
    sourceKind: 'analysis',
    url: projectUrl
  }]

  return {
    health: {
      status,
      confidence: 'High', // Deterministic
      keySignals: signals,
      risks,
      blockers: blockersStr,
      recommendations
    },
    sources
  }
}
