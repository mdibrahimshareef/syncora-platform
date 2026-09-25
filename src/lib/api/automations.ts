import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { AutomationRecord, AutomationRunRecord, AutomationActionLogRecord } from '../automations/types'

export type Automation = AutomationRecord;
export type AutomationRun = AutomationRunRecord;
export type AutomationActionLog = AutomationActionLogRecord;

export async function getAutomations(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Automation[]> {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as Automation[]
}

export async function createAutomation(
  supabase: SupabaseClient<Database>, 
  payload: Partial<Automation> & { workspace_id: string, name: string, trigger_type: string, actions: any[] }
): Promise<Automation> {
  const { data, error } = await supabase
    .from('automations')
    .insert(payload as any)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Automation
}

export async function updateAutomation(
  supabase: SupabaseClient<Database>, 
  id: string, 
  updates: Partial<Automation>
): Promise<Automation> {
  const { data, error } = await supabase
    .from('automations')
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Automation
}

export async function deleteAutomation(supabase: SupabaseClient<Database>, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

export async function getAutomationRuns(supabase: SupabaseClient<Database>, workspaceId: string): Promise<AutomationRun[]> {
  const { data, error } = await supabase
    .from('automation_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('executed_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data as unknown as AutomationRun[]
}

export async function getAutomationActionLogs(supabase: SupabaseClient<Database>, runId: string): Promise<AutomationActionLog[]> {
  const { data, error } = await supabase
    .from('automation_action_logs')
    .select('*')
    .eq('run_id', runId)
    .order('started_at', { ascending: true })

  if (error) throw error
  return data as unknown as AutomationActionLog[]
}
