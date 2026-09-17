import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export async function getAuditLogs(supabase: SupabaseClient<Database>, workspaceId: string, limit: number = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:actor_id(full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
export async function getOrgAuditLogs(supabase: SupabaseClient<Database>, orgId: string, limit: number = 200) {
  // First get all workspaces in the org
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('organization_id', orgId)
    
  if (wsError) throw wsError
  if (!workspaces || workspaces.length === 0) return []

  const workspaceIds = workspaces.map(w => w.id)

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:actor_id(full_name, avatar_url),
      workspace:workspace_id(name)
    `)
    .in('workspace_id', workspaceIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
