import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Approval = Database['public']['Tables']['approvals']['Row']

export async function getApprovalsRequestedByMe(supabase: SupabaseClient<Database>, workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from('approvals')
    .select(`
      *,
      approver:profiles!approvals_approver_id_fkey(id, full_name, avatar_url),
      requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getApprovalsAssignedToMe(supabase: SupabaseClient<Database>, workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from('approvals')
    .select(`
      *,
      approver:profiles!approvals_approver_id_fkey(id, full_name, avatar_url),
      requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .eq('approver_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getWorkspaceApprovals(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('approvals')
    .select(`
      *,
      approver:profiles!approvals_approver_id_fkey(id, full_name, avatar_url),
      requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function requestApproval(
  supabase: SupabaseClient<Database>,
  payload: Omit<Database['public']['Tables']['approvals']['Insert'], 'id' | 'created_at' | 'updated_at' | 'status'>
) {
  const { data, error } = await supabase
    .from('approvals')
    .insert({ ...payload, status: 'Pending' })
    .select(`
      *,
      approver:profiles!approvals_approver_id_fkey(id, full_name, avatar_url),
      requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)
    `)
    .single()

  if (error) throw error
  return data
}

export async function resolveApproval(
  supabase: SupabaseClient<Database>,
  approvalId: string,
  status: 'Approved' | 'Rejected' | 'Changes Requested',
  comment?: string
) {
  const { data, error } = await supabase
    .from('approvals')
    .update({ 
      status, 
      comment: comment || null,
      updated_at: new Date().toISOString() 
    })
    .eq('id', approvalId)
    .select(`
      *,
      approver:profiles!approvals_approver_id_fkey(id, full_name, avatar_url),
      requester:profiles!approvals_requester_id_fkey(id, full_name, avatar_url)
    `)
    .single()

  if (error) throw error
  return data
}
