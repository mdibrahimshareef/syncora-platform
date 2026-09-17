import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

type Workspace = Database['public']['Tables']['workspaces']['Row']
type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']

export async function getWorkspaces(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function createWorkspace(
  supabase: SupabaseClient<Database>,
  workspaceData: { name: string; slug: string; userId: string; organizationId: string }
): Promise<Workspace> {
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name: workspaceData.name,
      slug: workspaceData.slug,
      created_by: workspaceData.userId,
      organization_id: workspaceData.organizationId,
    })
    .select()
    .single()

  if (workspaceError) {
    throw workspaceError
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: workspaceData.userId,
      role: 'owner',
    })

  if (memberError) {
    await supabase.from('workspaces').delete().eq('id', workspace.id)
    throw memberError
  }

  return workspace
}

export async function updateWorkspace(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  updates: { name: string }
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getWorkspaceMembers(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      id,
      role,
      user_id,
      created_at,
      profiles!workspace_members_user_id_fkey (
        id,
        full_name,
        avatar_url,
        username,
        email,
        metadata
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getWorkspaceInvitations(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_invitations')
    .select(`
      id,
      email,
      role,
      status,
      created_at,
      expires_at
    `)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function inviteMember(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  email: string,
  role: 'admin' | 'member'
) {
  const { data, error } = await supabase
    .from('workspace_invitations')
    .insert({
      workspace_id: workspaceId,
      email,
      role,
    })
    .select()
    .single()

  if (error) throw error

  // Phase 17 & 18: Email Delivery Architecture & Local Development
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const inviteLink = `${appUrl}/join?token=${data.token}&type=workspace`

  if (process.env.NODE_ENV === 'development') {
    console.log('\n=============================================')
    console.log(`📧 MOCK EMAIL DELIVERED TO: ${email}`)
    console.log(`🔗 INVITATION LINK: ${inviteLink}`)
    console.log('=============================================\n')
  } else {
    // TODO: Production Email Provider Adapter (e.g. Resend)
    // await fetch('/api/send-invite', { method: 'POST', body: JSON.stringify({ email, inviteLink }) })
  }

  return { ...data, inviteLink }
}

export async function removeMember(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string
) {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function cancelWorkspaceInvitation(
  supabase: SupabaseClient<Database>,
  invitationId: string
) {
  const { error } = await supabase
    .from('workspace_invitations')
    .delete()
    .eq('id', invitationId)

  if (error) throw error
}

export async function updateMemberRole(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member' | 'owner'
) {
  const { error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function acceptInvitation(
  supabase: SupabaseClient<Database>,
  token: string
) {
  const { data, error } = await supabase
    .rpc('accept_invitation', { invitation_token: token })

  if (error) throw error
  return data
}
