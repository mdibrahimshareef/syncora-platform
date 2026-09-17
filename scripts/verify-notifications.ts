import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function runTests() {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  
  console.log("Creating test users...")
  const timestamp = Date.now()
  const userARes = await adminClient.auth.admin.createUser({ email: "usera$timestamp@doki.app", password: 'password', email_confirm: true })
  const userBRes = await adminClient.auth.admin.createUser({ email: "userb$timestamp@doki.app", password: 'password', email_confirm: true })
  const userCRes = await adminClient.auth.admin.createUser({ email: "userc$timestamp@doki.app", password: 'password', email_confirm: true })

  const userA = userARes.data.user!
  const userB = userBRes.data.user!
  const userC = userCRes.data.user!

  console.log("Setting up workspace and roles...")
  const { data: org } = await adminClient.from('organizations').insert({ name: "Test Org $timestamp", slug: "test-org-$timestamp", owner_id: userA.id }).select().single()

  const { data: ws } = await adminClient.from('workspaces').insert({ name: "Test WS $timestamp", slug: "test-ws-$timestamp", organization_id: org.id, created_by: userA.id }).select().single()
  
  await adminClient.from('workspace_members').insert([
    { workspace_id: ws.id, user_id: userA.id, role: 'owner' },
    { workspace_id: ws.id, user_id: userB.id, role: 'admin' },
    { workspace_id: ws.id, user_id: userC.id, role: 'member' }
  ])

  const { data: project } = await adminClient.from('projects').insert({
    workspace_id: ws.id, name: 'Test Project', slug: "test-project-$timestamp", created_by: userA.id, icon: 'code', color: 'bg-blue-500', status: 'Active'
  }).select().single()

  const { data: task } = await adminClient.from('tasks').insert({
    project_id: project.id, title: 'Test Task', status: 'Todo', priority: 'Medium', created_by: userA.id
  }).select().single()

  console.log("Logging in as User A...")
  const clientA = createClient(SUPABASE_URL, ANON_KEY)
  await clientA.auth.signInWithPassword({ email: "usera$timestamp@doki.app", password: 'password' })

  console.log("Logging in as User B...")
  const clientB = createClient(SUPABASE_URL, ANON_KEY)
  await clientB.auth.signInWithPassword({ email: "userb$timestamp@doki.app", password: 'password' })

  console.log("\n=== RUNNING NOTIFICATION ASSERTIONS ===")
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log("? PASS: $testName")
    } else {
      console.log("? FAIL: $testName")
      failed++
    }
  }

  // TEST 1
  await clientA.from('tasks').update({ assignee_id: userB.id }).eq('id', task.id)
  let { data: notifs } = await adminClient.from('notifications').select('*').eq('entity_id', task.id)
  assert(notifs!.length === 1, "Exactly one notification created on assignment")
  assert(notifs![0].recipient_id === userB.id, "Recipient is User B")
  assert(notifs![0].type === 'TASK_ASSIGNED', "Type is TASK_ASSIGNED")

  // TEST 2
  await clientA.from('tasks').update({ assignee_id: userB.id }).eq('id', task.id)
  notifs = (await adminClient.from('notifications').select('*').eq('entity_id', task.id)).data
  assert(notifs!.length === 1, "No duplicate notification on identical assignment")

  // TEST 3
  await clientA.from('tasks').update({ assignee_id: null }).eq('id', task.id)
  notifs = (await adminClient.from('notifications').select('*').eq('entity_id', task.id)).data
  assert(notifs!.length === 1, "No new notification on unassignment")

  // TEST 4
  await clientA.from('tasks').update({ assignee_id: userC.id }).eq('id', task.id)
  notifs = (await adminClient.from('notifications').select('*').eq('entity_id', task.id)).data
  assert(notifs!.length === 2, "Second notification created on reassignment")

  // TEST 5
  await clientB.from('tasks').update({ status: 'In Progress' }).eq('id', task.id)
  notifs = (await adminClient.from('notifications').select('*').eq('entity_id', task.id).eq('type', 'TASK_STATUS_CHANGED')).data
  assert(notifs!.length === 1, "Status change created notification")

  // TEST 6
  await clientA.from('comments').insert({ task_id: task.id, workspace_id: ws.id, author_id: userA.id, body: 'Hello' })
  notifs = (await adminClient.from('notifications').select('*').eq('entity_id', task.id).eq('type', 'COMMENT_ADDED')).data
  assert(notifs!.length === 1, "Comment created notification")

  // TEST 7
  await clientA.from('tasks').update({ assignee_id: userA.id }).eq('id', task.id)
  notifs = (await adminClient.from('notifications').select('*').eq('entity_id', task.id).eq('recipient_id', userA.id)).data
  assert(notifs!.length === 0, "No notification when user assigns to themselves")

  console.log("\n=== RESULTS: $failed FAILED ===\n")
  if (failed > 0) process.exit(1)
}

runTests().catch(console.error)
