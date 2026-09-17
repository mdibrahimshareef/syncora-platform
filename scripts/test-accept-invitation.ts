import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testAcceptInvite() {
  console.log("Creating test user 1 (Inviter)...")
  const email1 = `inviter-${Date.now()}@example.com`
  const { data: inviterData, error: err1 } = await adminAuthClient.auth.admin.createUser({ email: email1, password: 'password123', email_confirm: true })
  if (err1) throw err1
  const inviter = inviterData.user

  console.log("Creating test user 2 (Invitee)...")
  const email2 = `invitee-${Date.now()}@example.com`
  const { data: inviteeData, error: err2 } = await adminAuthClient.auth.admin.createUser({ email: email2, password: 'password123', email_confirm: true })
  if (err2) throw err2
  const invitee = inviteeData.user

  console.log("Signing in as Inviter...")
  const inviterClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await inviterClient.auth.signInWithPassword({ email: email1, password: 'password123' })

  console.log("Creating org and workspace...")
  const { data: org } = await inviterClient.from('organizations').insert({ name: 'Test', slug: `test-${Date.now()}`, owner_id: inviter.id }).select().single()
  await inviterClient.from('organization_members').insert({ org_id: org.id, user_id: inviter.id, role: 'owner' })
  const { data: ws } = await inviterClient.from('workspaces').insert({ name: 'Test WS', slug: `test-ws-${Date.now()}`, created_by: inviter.id, organization_id: org.id }).select().single()
  await inviterClient.from('workspace_members').insert({ workspace_id: ws.id, user_id: inviter.id, role: 'owner' })

  console.log("Inviting user 2...")
  const { data: invite } = await inviterClient.from('workspace_invitations').insert({ workspace_id: ws.id, email: email2, role: 'member' }).select().single()

  console.log("Signing in as Invitee...")
  const inviteeClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await inviteeClient.auth.signInWithPassword({ email: email2, password: 'password123' })

  console.log("Accepting invitation...")
  const { data: result, error: acceptError } = await inviteeClient.rpc('accept_invitation', { invitation_token: invite.token })
  
  if (acceptError) {
    console.error("Accept Error Object:", acceptError)
    console.error("Accept Error Stringified:", JSON.stringify(acceptError))
  } else {
    console.log("Accept Result:", result)
    
    // verify membership
    const { data: membership, error: memberErr } = await inviteeClient.from('workspace_members').select('*').eq('workspace_id', ws.id).eq('user_id', invitee.id).single()
    console.log("Membership after accept:", membership)
  }

  // Cleanup
  console.log("Cleaning up...")
  await adminAuthClient.auth.admin.deleteUser(inviter.id)
  await adminAuthClient.auth.admin.deleteUser(invitee.id)
}

testAcceptInvite().catch(console.error)
