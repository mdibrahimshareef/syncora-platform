import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export interface TestContext {
  adminClient: SupabaseClient;
  clientA: SupabaseClient;
  clientB: SupabaseClient;
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  wsA: { id: string; name: string };
  wsB: { id: string; name: string };
  wsShared: { id: string; name: string };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export function createWorkerClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function setupTestEnvironment(): Promise<TestContext> {
  const admin = getAdminClient();
  const timestamp = Date.now();
  const emailA = `test-user-a-${timestamp}@syncora.test`;
  const emailB = `test-user-b-${timestamp}@syncora.test`;
  const password = 'TestPassword123!@#';

  // 1. Create User A
  const { data: authA, error: errA } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test User A' }
  });
  if (errA || !authA.user) throw new Error(`Failed to create User A: ${errA?.message}`);

  // 2. Create User B
  const { data: authB, error: errB } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test User B' }
  });
  if (errB || !authB.user) throw new Error(`Failed to create User B: ${errB?.message}`);

  const userA = { id: authA.user.id, email: emailA };
  const userB = { id: authB.user.id, email: emailB };

  // 3. Ensure profiles exist
  await admin.from('profiles').upsert([
    { id: userA.id, full_name: 'Test User A' },
    { id: userB.id, full_name: 'Test User B' }
  ]);

  // 3b. Create test organizations
  const { data: orgDataA } = await admin.from('organizations').insert({
    name: `Test Org A ${timestamp}`,
    slug: `test-org-a-${timestamp}`,
    owner_id: userA.id
  }).select('id').single();

  const { data: orgDataB } = await admin.from('organizations').insert({
    name: `Test Org B ${timestamp}`,
    slug: `test-org-b-${timestamp}`,
    owner_id: userB.id
  }).select('id').single();

  if (!orgDataA || !orgDataB) throw new Error('Failed to create test organizations');

  await admin.from('organization_members').insert([
    { org_id: orgDataA.id, user_id: userA.id, role: 'owner' },
    { org_id: orgDataB.id, user_id: userB.id, role: 'owner' },
    { org_id: orgDataA.id, user_id: userB.id, role: 'member' } // B collaborates in Org A
  ]);

  // 4. Create isolated workspaces:
  // Workspace A (owned by User A in Org A)
  const { data: wsDataA, error: wsErrA } = await admin.from('workspaces').insert({
    name: `Test WS A ${timestamp}`,
    slug: `test-ws-a-${timestamp}`,
    created_by: userA.id,
    organization_id: orgDataA.id
  }).select('id, name').single();
  if (wsErrA || !wsDataA) throw new Error(`Failed to create Workspace A: ${wsErrA?.message}`);

  // Workspace B (owned by User B in Org B)
  const { data: wsDataB, error: wsErrB } = await admin.from('workspaces').insert({
    name: `Test WS B ${timestamp}`,
    slug: `test-ws-b-${timestamp}`,
    created_by: userB.id,
    organization_id: orgDataB.id
  }).select('id, name').single();
  if (wsErrB || !wsDataB) throw new Error(`Failed to create Workspace B: ${wsErrB?.message}`);

  // Shared Workspace X (Collaboration: User A and User B both members in Org A)
  const { data: wsDataShared, error: wsErrShared } = await admin.from('workspaces').insert({
    name: `Test WS Shared ${timestamp}`,
    slug: `test-ws-shared-${timestamp}`,
    created_by: userA.id,
    organization_id: orgDataA.id
  }).select('id, name').single();
  if (wsErrShared || !wsDataShared) throw new Error(`Failed to create Shared Workspace: ${wsErrShared?.message}`);

  // 5. Add workspace memberships
  await admin.from('workspace_members').insert([
    { workspace_id: wsDataA.id, user_id: userA.id, role: 'owner' },
    { workspace_id: wsDataB.id, user_id: userB.id, role: 'owner' },
    { workspace_id: wsDataShared.id, user_id: userA.id, role: 'owner' },
    { workspace_id: wsDataShared.id, user_id: userB.id, role: 'member' }
  ]);

  // 6. Sign in as User A and User B to get real authenticated tokens & clients
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionA, error: signErrA } = await clientA.auth.signInWithPassword({
    email: emailA,
    password
  });
  if (signErrA || !sessionA.session) throw new Error(`User A sign-in failed: ${signErrA?.message}`);

  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionB, error: signErrB } = await clientB.auth.signInWithPassword({
    email: emailB,
    password
  });
  if (signErrB || !sessionB.session) throw new Error(`User B sign-in failed: ${signErrB?.message}`);

  return {
    adminClient: admin,
    clientA,
    clientB,
    userA,
    userB,
    wsA: wsDataA,
    wsB: wsDataB,
    wsShared: wsDataShared
  };
}

export async function teardownTestEnvironment(ctx: TestContext): Promise<void> {
  const admin = ctx.adminClient;
  const workspaceIds = [ctx.wsA.id, ctx.wsB.id, ctx.wsShared.id];

  try {
    // Clean up dependent tables
    await admin.from('ai_memories').delete().in('workspace_id', workspaceIds);
    await admin.from('ai_decision_outcomes').delete().in('workspace_id', workspaceIds);
    await admin.from('ai_jobs').delete().in('workspace_id', workspaceIds);
    await admin.from('ai_insights').delete().in('workspace_id', workspaceIds);
    await admin.from('ai_workspace_policies').delete().in('workspace_id', workspaceIds);
    await admin.from('workspace_members').delete().in('workspace_id', workspaceIds);
    await admin.from('workspaces').delete().in('id', workspaceIds);
    
    // Clean up users
    await admin.auth.admin.deleteUser(ctx.userA.id);
    await admin.auth.admin.deleteUser(ctx.userB.id);
  } catch (err) {
    console.warn('Teardown notice:', err);
  }
}
