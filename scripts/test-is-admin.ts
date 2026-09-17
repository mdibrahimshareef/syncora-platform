import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function debugFunction() {
  const email1 = `inviter-${Date.now()}@example.com`
  const { data: inviterData } = await adminAuthClient.auth.admin.createUser({ email: email1, password: 'password123', email_confirm: true })
  const inviter = inviterData.user

  const inviterClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await inviterClient.auth.signInWithPassword({ email: email1, password: 'password123' })

  const { data: org } = await inviterClient.from('organizations').insert({ name: 'Test', slug: `test-${Date.now()}`, owner_id: inviter?.id }).select().single()
  await inviterClient.from('organization_members').insert({ org_id: org.id, user_id: inviter?.id, role: 'owner' })
  const { data: ws } = await inviterClient.from('workspaces').insert({ name: 'Test WS', slug: `test-ws-${Date.now()}`, created_by: inviter?.id, organization_id: org.id }).select().single()
  await inviterClient.from('workspace_members').insert({ workspace_id: ws.id, user_id: inviter?.id, role: 'owner' })

  console.log("Testing is_workspace_admin_or_owner via RPC if possible...")
  const { data, error } = await inviterClient.rpc('is_workspace_admin_or_owner', { workspace_uuid: ws.id })
  console.log("Direct RPC Result:", data, error)
  
  // Clean up
  if (inviter?.id) {
    await adminAuthClient.auth.admin.deleteUser(inviter.id)
  }
}

debugFunction().catch(console.error)
