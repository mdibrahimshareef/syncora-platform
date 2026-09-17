import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerRequest = Database['public']['Tables']['customer_requests']['Row']

export async function getCustomers(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function getCustomerRequests(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('customer_requests')
    .select(`
      *,
      customer:customer_id(name, organization),
      project:linked_project_id(name),
      task:linked_task_id(title)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createCustomer(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['customers']['Insert'], 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createCustomerRequest(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['customer_requests']['Insert'], 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('customer_requests')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCustomerRequest(
  supabase: SupabaseClient<Database>,
  requestId: string,
  payload: Database['public']['Tables']['customer_requests']['Update']
) {
  const { data, error } = await supabase
    .from('customer_requests')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}
