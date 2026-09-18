import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { Integration, WebhookEndpoint } from "../integrations/types"

export async function getIntegrations(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Integration[]> {
  const { data, error } = await (supabase as any)
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) throw error
  return data as Integration[]
}

export async function disconnectIntegration(supabase: SupabaseClient<Database>, integrationId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('integrations')
    .update({ 
      status: 'disconnected', 
      disconnected_at: new Date().toISOString() 
    })
    .eq('id', integrationId)

  if (error) throw error
}

export async function getWebhooks(supabase: SupabaseClient<Database>, workspaceId: string): Promise<WebhookEndpoint[]> {
  const { data, error } = await (supabase as any)
    .from('webhook_endpoints')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as WebhookEndpoint[]
}

export async function createWebhook(
  supabase: SupabaseClient<Database>, 
  workspaceId: string, 
  payload: { name: string, url: string, secret: string, subscribed_events: string[], userId: string }
) {
  const { data, error } = await (supabase as any)
    .from('webhook_endpoints')
    .insert({
      workspace_id: workspaceId,
      name: payload.name,
      url: payload.url,
      secret: payload.secret,
      subscribed_events: payload.subscribed_events,
      created_by: payload.userId,
      status: 'active'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWebhook(supabase: SupabaseClient<Database>, webhookId: string) {
  const { error } = await (supabase as any)
    .from('webhook_endpoints')
    .delete()
    .eq('id', webhookId)

  if (error) throw error
}
