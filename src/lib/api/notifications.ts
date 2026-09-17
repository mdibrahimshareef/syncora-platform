import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Notification = Database['public']['Tables']['notifications']['Row']

export async function getNotifications(supabase: SupabaseClient<Database>, userId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:actor_id(id, full_name, avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getUnreadNotificationCount(supabase: SupabaseClient<Database>, userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)

  if (error) throw error
  return count || 0
}

export async function markNotificationAsRead(supabase: SupabaseClient<Database>, notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) throw error
  return true
}

export async function markAllNotificationsAsRead(supabase: SupabaseClient<Database>, userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null)

  if (error) throw error
  return true
}

export async function createNotification(
  supabase: SupabaseClient<Database>,
  payload: {
    recipientId: string
    actorId: string
    workspaceId: string
    type: string
    title: string
    content?: string
    link?: string
    entityType?: string
    entityId?: string
  }
) {
  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert({
      recipient_id: payload.recipientId,
      actor_id: payload.actorId,
      workspace_id: payload.workspaceId,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      link: payload.link,
      entity_type: payload.entityType as any,
      entity_id: payload.entityId as any
    })
    .select()
    .single()

  if (error) throw error
  return data
}
