import { SupabaseClient } from '@supabase/supabase-js'
import { Milestone } from '@/types'

export async function getMilestones(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error)
    return []
  }

  return data.map(m => ({
    id: m.id,
    projectId: m.project_id,
    workspaceId: m.workspace_id,
    name: m.name,
    description: m.description,
    ownerId: m.owner_id,
    startDate: m.start_date,
    dueDate: m.due_date,
    status: m.status,
    createdAt: m.created_at,
    updatedAt: m.updated_at
  })) as Milestone[]
}

export async function createMilestone(
  supabase: SupabaseClient,
  workspaceId: string,
  projectId: string,
  milestoneData: Partial<Milestone>
) {
  const payload = {
    workspace_id: workspaceId,
    project_id: projectId,
    name: milestoneData.name,
    description: milestoneData.description,
    owner_id: milestoneData.ownerId,
    start_date: milestoneData.startDate,
    due_date: milestoneData.dueDate,
    status: milestoneData.status || 'Open'
  }

  const { data, error } = await supabase
    .from('milestones')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating milestone:', error)
    throw error
  }

  return {
    id: data.id,
    projectId: data.project_id,
    workspaceId: data.workspace_id,
    name: data.name,
    description: data.description,
    ownerId: data.owner_id,
    startDate: data.start_date,
    dueDate: data.due_date,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Milestone
}

export async function updateMilestone(
  supabase: SupabaseClient,
  milestoneId: string,
  updates: Partial<Milestone>
) {
  const payload: any = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.ownerId !== undefined) payload.owner_id = updates.ownerId
  if (updates.startDate !== undefined) payload.start_date = updates.startDate
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate
  if (updates.status !== undefined) payload.status = updates.status
  
  // Note: we don't have a trigger for updated_at now, so we manually update it
  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('milestones')
    .update(payload)
    .eq('id', milestoneId)
    .select()
    .single()

  if (error) {
    console.error('Error updating milestone:', error)
    throw error
  }

  return {
    id: data.id,
    projectId: data.project_id,
    workspaceId: data.workspace_id,
    name: data.name,
    description: data.description,
    ownerId: data.owner_id,
    startDate: data.start_date,
    dueDate: data.due_date,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as Milestone
}

export async function deleteMilestone(supabase: SupabaseClient, milestoneId: string) {
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId)

  if (error) {
    console.error('Error deleting milestone:', error)
    throw error
  }
  return true
}
