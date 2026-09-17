import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type RequestForm = Database['public']['Tables']['request_forms']['Row']
export type Request = Database['public']['Tables']['requests']['Row']

export async function getRequestForms(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('request_forms')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getRequests(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      form:form_id(*),
      requester:requester_id(id, full_name, avatar_url),
      task:linked_task_id(id, title, status)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createRequestForm(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['request_forms']['Insert'], 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('request_forms')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function submitRequest(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['requests']['Insert'], 'id' | 'created_at' | 'updated_at' | 'status'>
) {
  const { data, error } = await supabase
    .from('requests')
    .insert({ ...payload, status: 'New' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRequestStatus(
  supabase: SupabaseClient<Database>,
  requestId: string,
  status: string,
  linkedTaskId?: string
) {
  const updates: any = { status, updated_at: new Date().toISOString() }
  if (linkedTaskId !== undefined) {
    updates.linked_task_id = linkedTaskId
  }

  const { data, error } = await supabase
    .from('requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}
