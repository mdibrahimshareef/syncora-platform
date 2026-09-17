import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testDocUpdate() {
  const email = `doc-tester-${Date.now()}@example.com`
  const { data: userData } = await adminAuthClient.auth.admin.createUser({ email, password: 'password123', email_confirm: true })
  const user = userData.user!

  const client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false }})
  await client.auth.signInWithPassword({ email, password: 'password123' })

  // 1. Create org and workspace
  const { data: org } = await client.from('organizations').insert({ name: 'Test Org', slug: `test-org-${Date.now()}`, owner_id: user.id }).select().single()
  await client.from('organization_members').insert({ org_id: org.id, user_id: user.id, role: 'owner' })
  
  const { data: ws } = await client.from('workspaces').insert({ name: 'Test WS', slug: `test-ws-${Date.now()}`, created_by: user.id, organization_id: org.id }).select().single()
  await client.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' })

  // 2. Create document
  const { data: doc, error: createErr } = await client.from('documents').insert({
    workspace_id: ws.id,
    title: 'Untitled Document',
    content: '',
    emoji_icon: '📄',
    author_id: user.id
  }).select().single()

  console.log("Create Doc Result:", doc, createErr)

  // 3. Update document
  if (doc) {
    const { data: updated, error: updateErr } = await client.from('documents').update({
      title: 'New Title',
      content: 'New Content',
      updated_at: new Date().toISOString()
    }).eq('id', doc.id).select().single()

    console.log("Update Doc Result:", updated, updateErr)
  }

  // Cleanup
  await adminAuthClient.auth.admin.deleteUser(user.id)
}

testDocUpdate().catch(console.error)
