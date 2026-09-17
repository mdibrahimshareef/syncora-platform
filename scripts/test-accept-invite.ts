import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testAcceptWorkspaceInviteTwice() {
  console.log("Creating inviter...")
  const email1 = `inviter-${Date.now()}@example.com`
  const { data: inviterData } = await adminAuthClient.auth.admin.createUser({ email: email1, password: 'password123', email_confirm: true })
  const inviter = inviterData.user!

  console.log("Signing in as Inviter...")
  const inviterClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await inviterClient.auth.signInWithPassword({ email: email1, password: 'password123' })

  console.log("Creating org & workspace...")
  const { data: org } = await inviterClient.from('organizations').insert({ name: 'Test Org', slug: `test-${Date.now()}`, owner_id: inviter.id }).select().single()
  await inviterClient.from('organization_members').insert({ org_id: org.id, user_id: inviter.id, role: 'owner' })
  
  const { data: ws } = await inviterClient.from('workspaces').insert({ name: 'Test WS', slug: `test-ws-${Date.now()}`, created_by: inviter.id, organization_id: org.id }).select().single()
  await adminAuthClient.from('workspace_members').insert({ workspace_id: ws.id, user_id: inviter.id, role: 'admin' })

  console.log("Creating invitee...")
  const email2 = `invitee-${Date.now()}@example.com`
  const { data: inviteeData } = await adminAuthClient.auth.admin.createUser({ email: email2, password: 'password123', email_confirm: true })
  const invitee = inviteeData.user!

  console.log("Inviting user 2 to workspace...")
  const { data: invite, error: inviteErr } = await inviterClient
    .from('workspace_invitations')
    .insert({
      workspace_id: ws.id,
      email: email2,
      role: 'member',
    })
    .select()
    .single()
  
  if (inviteErr) {
    console.error("Invite Error:", inviteErr)
    return
  }

  console.log("Signing in as Invitee...")
  const inviteeClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await inviteeClient.auth.signInWithPassword({ email: email2, password: 'password123' })

  console.log("Accepting invitation 1st time...")
  const { data: acceptData1, error: acceptErr1 } = await inviteeClient.rpc('accept_invitation', {
    invitation_token: invite.token
  })
  console.log("1st time error:", acceptErr1)

  console.log("Accepting invitation 2nd time...")
  const { data: acceptData2, error: acceptErr2 } = await inviteeClient.rpc('accept_invitation', {
    invitation_token: invite.token
  })
  console.log("2nd time error:", acceptErr2)

  // Cleanup
  console.log("Cleaning up...")
  await adminAuthClient.auth.admin.deleteUser(inviter.id)
  await adminAuthClient.auth.admin.deleteUser(invitee.id)
}

testAcceptWorkspaceInviteTwice().catch(console.error)
