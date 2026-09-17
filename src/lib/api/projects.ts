import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { Project } from "@/types"

export async function getProjects(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      profiles:created_by(id, full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Transform to match application types
  return data.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string) || '',
    icon: (p.icon as string) || undefined,
    color: (p.color as string) || undefined,
    status: p.status as import("@/types").ProjectStatus,
    progress: 0, // In a real app, calculate from tasks
    taskCount: 0, // Calculate from tasks
    members: [], // Connect to workspace_members in future
    updatedAt: p.updated_at as any,
    budget: p.budget as number,
    spent: p.spent as number,
    currency: p.currency as string,
    health: p.health as string,
    taskTypes: (p.task_types as string[]) || ['Task']
  }))
}

export async function createProject(
  supabase: SupabaseClient<Database>, 
  workspaceId: string, 
  payload: { name: string, description?: string, status?: string, icon?: string, color?: string, userId: string }
) {
  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      workspace_id: workspaceId,
      name: payload.name,
      slug: slug,
      description: payload.description,
      status: payload.status || 'Active',
      icon: payload.icon,
      color: payload.color,
      created_by: payload.userId
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(
  supabase: SupabaseClient<Database>, 
  projectId: string, 
  payload: { name?: string, description?: string, status?: string, icon?: string, color?: string, budget?: number, spent?: number, currency?: string, health?: string }
) {
  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProjectStatuses(supabase: SupabaseClient<Database>, projectId: string) {
  const { data, error } = await supabase
    .from('project_statuses')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) throw error
  return data
}

export async function deleteProject(supabase: SupabaseClient<Database>, projectId: string) {
  console.log("Calling deleteProject in API with ID:", projectId)
  if (!projectId) throw new Error("projectId is required")

  const response = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  console.log("Supabase delete response:", response)

  if (response.error) {
    console.error("Supabase API Error:", response.error)
    throw new Error(response.error.message || JSON.stringify(response.error))
  }
}
