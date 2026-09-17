import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Automation = {
  id: string
  workspace_id: string
  name: string
  trigger_type: string
  trigger_config: any
  action_type: string
  action_config: any
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type AutomationRun = {
  id: string
  automation_id: string
  workspace_id: string
  status: 'Success' | 'Failed'
  error_message: string | null
  executed_at: string
}

export async function getAutomations(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Automation[]> {
  const { data, error } = await (supabase as any)
    .from('automations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Automation[]
}

export async function createAutomation(
  supabase: SupabaseClient<Database>, 
  payload: { workspace_id: string, name: string, trigger_type: string, trigger_config: any, action_type: string, action_config: any, created_by: string }
): Promise<Automation> {
  const { data, error } = await (supabase as any)
    .from('automations')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Automation
}

export async function updateAutomation(
  supabase: SupabaseClient<Database>, 
  id: string, 
  updates: Partial<Automation>
): Promise<Automation> {
  const { data, error } = await (supabase as any)
    .from('automations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Automation
}

export async function deleteAutomation(supabase: SupabaseClient<Database>, id: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('automations')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function getAutomationRuns(supabase: SupabaseClient<Database>, workspaceId: string): Promise<AutomationRun[]> {
  const { data, error } = await (supabase as any)
    .from('automation_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('executed_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data as AutomationRun[]
}
