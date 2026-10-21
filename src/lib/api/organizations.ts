import { SupabaseClient } from "@supabase/supabase-js"
import { Database, Json } from "@/types/supabase"

export type OrganizationMemberItem = {
  id: string
  role: string
  user_id: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    username: string | null
    email: string | null
    avatar_url: string | null
    metadata: Json | null
  } | null
}

export type OrganizationInvitationItem = {
  id: string
  email: string
  role: string
  status: string
  token: string
  created_at: string
  expires_at: string
}

export async function getOrganizationMembers(supabase: SupabaseClient<Database>, orgId: string): Promise<OrganizationMemberItem[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      user_id,
      created_at,
      profiles!organization_members_user_id_fkey (
        id,
        full_name,
        username,
        email,
        avatar_url,
        metadata
      )
    `)
    .eq('org_id', orgId)

  if (error) throw error
  return (data || []) as unknown as OrganizationMemberItem[]
}

export async function updateOrganization(
  supabase: SupabaseClient<Database>,
  orgId: string,
  updates: { name?: string; slug?: string; logo_url?: string }
) {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeOrganizationMember(
  supabase: SupabaseClient<Database>, 
  orgId: string, 
  userId: string
) {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateOrganizationMemberRole(
  supabase: SupabaseClient<Database>,
  orgId: string,
  userId: string,
  role: string
) {
  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function getOrganizationInvitations(supabase: SupabaseClient<Database>, orgId: string): Promise<OrganizationInvitationItem[]> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select(`
      id,
      email,
      role,
      status,
      token,
      created_at,
      expires_at
    `)
    .eq('org_id', orgId)
    .in('status', ['pending', 'expired'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as OrganizationInvitationItem[]
}

export async function createOrganizationInvitation(
  supabase: SupabaseClient<Database>,
  orgId: string,
  email: string,
  role: string,
  invitedBy: string
) {
  // Check if member already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', email)
    .single()

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', existingUser.id)
      .single()

    if (existingMember) {
      throw new Error("User is already a member of this organization")
    }
  }

  // Check if pending invite exists
  const { data: existingInvite } = await supabase
    .from('organization_invitations')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('email', email)
    .single()

  if (existingInvite) {
    if (existingInvite.status === 'pending') {
      throw new Error("User has already been invited")
    } else {
      // Re-invite by deleting the old one
      await supabase.from('organization_invitations').delete().eq('id', existingInvite.id)
    }
  }

  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      org_id: orgId,
      email,
      role,
      invited_by: invitedBy,
    })
    .select()
    .single()

  if (error) throw error

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const inviteLink = `${appUrl}/join?token=${data.token}&type=org`

  return { ...data, inviteLink }
}

export async function cancelOrganizationInvitation(supabase: SupabaseClient<Database>, inviteId: string) {
  const { error } = await supabase
    .from('organization_invitations')
    .delete()
    .eq('id', inviteId)

  if (error) throw error
}

export async function acceptOrganizationInvitation(supabase: SupabaseClient<Database>, token: string) {
  const { data, error } = await supabase.rpc('accept_organization_invitation', {
    invitation_token: token
  })

  if (error) throw error
  return data
}
