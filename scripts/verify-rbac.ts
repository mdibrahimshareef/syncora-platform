import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function runTests() {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  console.log("Creating test users...")
  const timestamp = Date.now()
  const userOwnerRes = await adminClient.auth.admin.createUser({ email: `owner${timestamp}@doki.app`, password: 'password', email_confirm: true })
  const userAdminRes = await adminClient.auth.admin.createUser({ email: `admin${timestamp}@doki.app`, password: 'password', email_confirm: true })
  const userMemberRes = await adminClient.auth.admin.createUser({ email: `member${timestamp}@doki.app`, password: 'password', email_confirm: true })
  const userForeignRes = await adminClient.auth.admin.createUser({ email: `foreign${timestamp}@doki.app`, password: 'password', email_confirm: true })

  const userOwner = userOwnerRes.data.user!
  const userAdmin = userAdminRes.data.user!
  const userMember = userMemberRes.data.user!
  const userForeign = userForeignRes.data.user!

  console.log("Setting up workspace and roles...")
  const { data: org, error: orgErr } = await adminClient.from('organizations').insert({ name: `Test Org ${timestamp}`, slug: `test-org-${timestamp}`, owner_id: userOwner.id }).select().single()
  if (orgErr) throw orgErr

  const { data: ws, error: wsErr } = await adminClient.from('workspaces').insert({ name: `Test WS ${timestamp}`, slug: `test-ws-${timestamp}`, organization_id: org.id, created_by: userOwner.id }).select().single()
  if (wsErr) throw wsErr
  
  await adminClient.from('workspace_members').insert([
    { workspace_id: ws.id, user_id: userOwner.id, role: 'owner' },
    { workspace_id: ws.id, user_id: userAdmin.id, role: 'admin' },
    { workspace_id: ws.id, user_id: userMember.id, role: 'member' }
  ])

  const { data: project } = await adminClient.from('projects').insert({
    workspace_id: ws.id, name: 'Test Project', slug: `test-project-${timestamp}`, created_by: userOwner.id, icon: 'code', color: 'bg-blue-500', status: 'Active'
  }).select().single()

  console.log("Logging in as users...")
  const ownerClient = createClient(SUPABASE_URL, ANON_KEY)
  await ownerClient.auth.signInWithPassword({ email: `owner${timestamp}@doki.app`, password: 'password' })

  const adminClient2 = createClient(SUPABASE_URL, ANON_KEY)
  await adminClient2.auth.signInWithPassword({ email: `admin${timestamp}@doki.app`, password: 'password' })

  const memberClient = createClient(SUPABASE_URL, ANON_KEY)
  await memberClient.auth.signInWithPassword({ email: `member${timestamp}@doki.app`, password: 'password' })
  
  const foreignClient = createClient(SUPABASE_URL, ANON_KEY)
  await foreignClient.auth.signInWithPassword({ email: `foreign${timestamp}@doki.app`, password: 'password' })

  console.log("\n=== RUNNING RBAC ASSERTIONS ===")
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
    } else {
      console.log(`❌ FAIL: ${testName}`)
      failed++
    }
  }

  // --- ROLE ESCALATION TESTS ---
  
  // Wait, RLS update/delete queries usually return empty arrays when denied, NOT an error, unless we select them
  // We can do `.delete().eq(...).select()` and check if length === 0
  
  const r1 = await adminClient2.from('workspace_members').delete().eq('workspace_id', ws.id).eq('user_id', userOwner.id).select()
  assert(r1.error != null || r1.data?.length === 0, "Admin tries to remove Owner (Denied)")

  const r2 = await adminClient2.from('workspace_members').update({ role: 'member' }).eq('workspace_id', ws.id).eq('user_id', userOwner.id).select()
  assert(r2.error != null || r2.data?.length === 0, "Admin tries to demote Owner (Denied)")

  const r3 = await adminClient2.from('workspace_members').update({ role: 'owner' }).eq('workspace_id', ws.id).eq('user_id', userAdmin.id).select()
  assert(r3.error != null || r3.data?.length === 0, "Admin tries to elevate themselves to Owner (Denied)")

  const r4 = await memberClient.from('workspace_members').update({ role: 'admin' }).eq('workspace_id', ws.id).eq('user_id', userMember.id).select()
  assert(r4.error != null || r4.data?.length === 0, "Member tries to elevate themselves to Admin (Denied)")

  const r5 = await ownerClient.from('workspace_members').delete().eq('workspace_id', ws.id).eq('user_id', userAdmin.id).select()
  assert(!r5.error && (r5.data?.length ?? 0) > 0, "Owner tries to remove Admin (Allowed)")
  // Re-add Admin for the next tests
  await adminClient.from('workspace_members').insert({ workspace_id: ws.id, user_id: userAdmin.id, role: 'admin' })

  // --- PROJECT DELETION TESTS ---
  const p1 = await memberClient.from('projects').delete().eq('id', project.id).select()
  assert(p1.error != null || p1.data?.length === 0, "Member tries to delete project (Denied)")

  const p2 = await adminClient2.from('projects').delete().eq('id', project.id).select()
  assert(!p2.error && (p2.data?.length ?? 0) > 0, "Admin tries to delete project (Allowed)")

  // --- WORKSPACE ISOLATION TESTS ---
  const w1 = await foreignClient.from('workspaces').select('*').eq('id', ws.id)
  assert(w1.data?.length === 0, "Foreign user tries to view workspace (Denied)")

  const t1 = await foreignClient.from('projects').select('*').eq('workspace_id', ws.id)
  assert(t1.data?.length === 0, "Foreign user tries to view projects (Denied)")

  console.log(`\n=== RESULTS: ${failed} FAILED ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
