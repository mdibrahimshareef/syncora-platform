import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { Activity } from "@/types"

export async function getRecentActivity(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles:actor_id(id, full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  
  return data.map((a: Record<string, unknown>) => {
    const profiles = a.profiles as Record<string, unknown> | undefined;
    const metadata = a.metadata as Record<string, unknown> | undefined;
    return {
      id: a.id as string,
      user: {
        id: (profiles?.id as string) || '',
        name: (profiles?.full_name as string) || 'Unknown User',
        initials: ((profiles?.full_name as string) || 'U').substring(0, 2).toUpperCase(),
        email: '',
        role: 'Member'
      },
      action: a.action as import("@/types").ActivityAction,
      target: (metadata?.targetName as string) || 'item',
      timestamp: a.created_at as string
    }
  })
}

export async function getTaskActivity(supabase: SupabaseClient<Database>, taskId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles:actor_id(id, full_name, avatar_url)
    `)
    .eq('entity_type', 'task')
    .eq('entity_id', taskId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  
  return data.map((a: Record<string, unknown>) => {
    const profiles = a.profiles as Record<string, unknown> | undefined;
    const metadata = a.metadata as Record<string, unknown> | undefined;
    return {
      id: a.id as string,
      user: {
        id: (profiles?.id as string) || '',
        name: (profiles?.full_name as string) || 'Unknown User',
        initials: ((profiles?.full_name as string) || 'U').substring(0, 2).toUpperCase(),
        email: '',
        role: 'Member'
      },
      action: a.action as import("@/types").ActivityAction,
      target: (metadata?.targetName as string) || 'item',
      timestamp: a.created_at as string
    }
  })
}

export async function logActivity(
  supabase: SupabaseClient<Database>, 
  workspaceId: string, 
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, unknown>
) {
  const { error } = await supabase
    .from('activities')
    .insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      metadata: metadata as any
    })

  if (error) console.error("Failed to log activity:", error)
}
