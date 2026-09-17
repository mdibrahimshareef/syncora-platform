import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testInvite() {
  console.log("Creating test user 1 (Inviter)...")
  const email1 = `inviter-${Date.now()}@example.com`
  const { data: inviterData, error: err1 } = await adminAuthClient.auth.admin.createUser({ email: email1, password: 'password123', email_confirm: true })
  if (err1) throw err1
  const inviter = inviterData.user

  console.log("Signing in as Inviter...")
  const inviterClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await inviterClient.auth.signInWithPassword({ email: email1, password: 'password123' })

  console.log("Creating org and workspace...")
  const { data: org, error: orgErr } = await inviterClient.from('organizations').insert({ name: 'Test', slug: `test-${Date.now()}`, owner_id: inviter.id }).select().single()
  if (orgErr) throw orgErr

  const { error: omErr } = await inviterClient.from('organization_members').insert({ org_id: org.id, user_id: inviter.id, role: 'owner' })
  if (omErr) throw omErr

  const { data: ws, error: wsErr } = await inviterClient.from('workspaces').insert({ name: 'Test WS', slug: `test-ws-${Date.now()}`, created_by: inviter.id, organization_id: org.id }).select().single()
  if (wsErr) throw wsErr

  // Insert as owner to bypass the insert policy constraint, then change to admin
  const { error: wmErr } = await adminAuthClient.from('workspace_members').insert({ workspace_id: ws.id, user_id: inviter.id, role: 'admin' })
  if (wmErr) throw wmErr

  console.log("Inviting user 2 via API method...")
  const email2 = `invitee-${Date.now()}@example.com`
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
    console.error("Invite Error Object:", inviteErr)
    console.error("Invite Error Stringified:", JSON.stringify(inviteErr))
  } else {
    console.log("Invite Result:", invite)
  }

  // Cleanup
  console.log("Cleaning up...")
  await adminAuthClient.auth.admin.deleteUser(inviter.id)
}

testInvite().catch(console.error)
