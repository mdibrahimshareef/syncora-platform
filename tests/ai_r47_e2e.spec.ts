import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminDb = createClient(supabaseUrl, supabaseServiceRole);

async function createE2ETestContext(prefix: string) {
  const timestamp = Date.now();
  const email = `e2e-${prefix}-${timestamp}@syncora.test`;
  const password = 'Password123!@#';

  const { data: authData, error: authError } = await adminDb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${prefix}` }
  });
  if (authError || !authData.user) throw authError;
  const user = authData.user;

  await adminDb.from('profiles').upsert({ id: user.id, full_name: `E2E ${prefix}` });

  // Organization
  const orgSlug = `${prefix.toLowerCase()}-org-${timestamp}`;
  const { data: org, error: orgError } = await adminDb.from('organizations').insert({
    name: `Org ${prefix}`,
    slug: orgSlug,
    owner_id: user.id
  }).select().single();
  if (orgError) throw orgError;

  await adminDb.from('organization_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'owner'
  });

  // Workspace
  const { data: ws, error: wsError } = await adminDb.from('workspaces').insert({
    name: `WS ${prefix}`,
    slug: `${prefix.toLowerCase()}-ws-${timestamp}`,
    organization_id: org.id,
    created_by: user.id
  }).select().single();
  if (wsError) throw wsError;

  await adminDb.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner'
  });

  return {
    user: { id: user.id },
    org: { id: org.id, slug: org.slug },
    workspace: { id: ws.id },
    email,
    password
  };
}

interface E2EContext {
  user: { id: string };
  org: { id: string; slug: string };
  workspace: { id: string };
  email: string;
  password: string;
}

test.describe('Release 4.7 End-to-End Browser & System Scenarios (Section 8)', () => {
  let adminCtx: E2EContext;
  let memberCtx: E2EContext;

  test.beforeAll(async () => {
    adminCtx = await createE2ETestContext('Admin');
    memberCtx = await createE2ETestContext('Member');

    // Add Member user to Admin organization and workspace as a plain non-admin 'member'
    await adminDb.from('organization_members').insert({
      org_id: adminCtx.org.id,
      user_id: memberCtx.user.id,
      role: 'member'
    });
    await adminDb.from('workspace_members').insert({
      workspace_id: adminCtx.workspace.id,
      user_id: memberCtx.user.id,
      role: 'member'
    });
  });

  test.afterAll(async () => {
    if (adminCtx) {
      await adminDb.from('ai_jobs').delete().eq('workspace_id', adminCtx.workspace.id);
      await adminDb.from('workspace_members').delete().eq('workspace_id', adminCtx.workspace.id);
      await adminDb.from('workspaces').delete().eq('id', adminCtx.workspace.id);
      await adminDb.from('organization_members').delete().eq('org_id', adminCtx.org.id);
      await adminDb.from('organizations').delete().eq('id', adminCtx.org.id);
      await adminDb.auth.admin.deleteUser(adminCtx.user.id);
    }
    if (memberCtx) {
      await adminDb.from('ai_jobs').delete().eq('workspace_id', memberCtx.workspace.id);
      await adminDb.from('workspace_members').delete().eq('workspace_id', memberCtx.workspace.id);
      await adminDb.from('workspaces').delete().eq('id', memberCtx.workspace.id);
      await adminDb.from('organization_members').delete().eq('org_id', memberCtx.org.id);
      await adminDb.from('organizations').delete().eq('id', memberCtx.org.id);
      await adminDb.auth.admin.deleteUser(memberCtx.user.id);
    }
  });

  // Scenario 1: Authentication and Workspace Context Retention across Navigation and Refresh
  test('Scenario 1 [Auth & Context Persistence]: Logs in, navigates to AI admin, and retains active workspace across refresh', async ({ page }) => {
    // 1. Login as Admin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', adminCtx.email);
    await page.fill('input[type="password"]', adminCtx.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to workspace shell
    await page.waitForURL(new RegExp(`.*${adminCtx.org.slug}.*`), { timeout: 15000 });

    // 2. Navigate directly to AI Admin page
    await page.goto(`http://localhost:3000/${adminCtx.org.slug}/admin/ai`);

    // Verify AI Admin page renders correct title and resolved workspace ID
    await expect(page.locator('h1')).toContainText('AI Runtime Observability');
    await expect(page.getByText(`Workspace ID: ${adminCtx.workspace.id}`)).toBeVisible();

    // 3. Page Refresh Test
    await page.reload();
    await expect(page.locator('h1')).toContainText('AI Runtime Observability');
    await expect(page.getByText(`Workspace ID: ${adminCtx.workspace.id}`)).toBeVisible();
  });

  // Scenario 2: Admin Workflow Approval and Rejection Interactive Controls
  test('Scenario 2 [Workflow Approval Controls]: Admin views WAITING_APPROVAL job and executes Approve/Reject', async ({ page }) => {
    // 1. Seed two jobs in WAITING_APPROVAL for the admin workspace
    const { data: jobToApprove } = await (adminDb.from('ai_jobs') as any).insert({
      workspace_id: adminCtx.workspace.id,
      user_id: adminCtx.user.id,
      job_type: 'EVENT_TRIGGERED',
      trigger_type: 'manual.e2e_approval',
      status: 'WAITING_APPROVAL'
    }).select('id').single();

    const { data: jobToReject } = await (adminDb.from('ai_jobs') as any).insert({
      workspace_id: adminCtx.workspace.id,
      user_id: adminCtx.user.id,
      job_type: 'EVENT_TRIGGERED',
      trigger_type: 'manual.e2e_rejection',
      status: 'WAITING_APPROVAL'
    }).select('id').single();

    // 2. Login as Admin and load AI admin page
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', adminCtx.email);
    await page.fill('input[type="password"]', adminCtx.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`.*${adminCtx.org.slug}.*`), { timeout: 15000 });

    await page.goto(`http://localhost:3000/${adminCtx.org.slug}/admin/ai`);

    // Verify jobs appear in UI
    await expect(page.getByText(`ID: ${jobToApprove.id}`)).toBeVisible();
    await expect(page.getByText(`ID: ${jobToReject.id}`)).toBeVisible();

    // 3. Click Approve on the first job (target exact card row containing the ID)
    const approveCard = page.locator('div.border.rounded-lg', { hasText: jobToApprove.id });
    await approveCard.getByRole('button', { name: 'Approve' }).click();

    // Verify DB transition to QUEUED
    await expect.poll(async () => {
      const { data } = await adminDb.from('ai_jobs').select('status').eq('id', jobToApprove.id).single();
      return data?.status;
    }, { timeout: 10000 }).toBe('QUEUED');

    // 4. Click Reject on the second job
    const rejectCard = page.locator('div.border.rounded-lg', { hasText: jobToReject.id });
    await rejectCard.getByRole('button', { name: 'Reject' }).click();

    // Verify DB transition to CANCELLED
    await expect.poll(async () => {
      const { data } = await adminDb.from('ai_jobs').select('status').eq('id', jobToReject.id).single();
      return data?.status;
    }, { timeout: 10000 }).toBe('CANCELLED');
  });

  // Scenario 3: Non-Admin Access Guard (Server-side RBAC Redirect and API 403 Denial)
  test('Scenario 3 [RBAC Access Guard]: Non-admin user visiting AI admin page is redirected away and API returns 403', async ({ page }) => {
    // Clear cookies from previous admin session so login page loads properly
    await page.context().clearCookies();

    // Login as member
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', memberCtx.email);
    await page.fill('input[type="password"]', memberCtx.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`.*${memberCtx.org.slug}.*`), { timeout: 15000 });

    // Attempt to access AI Admin console of adminCtx.org where this user is only a 'member'
    await page.goto(`http://localhost:3000/${adminCtx.org.slug}/admin/ai`);

    // 1. Server-side redirect guard: AdminLayout redirects non-admins away from /admin/ai back to /[orgSlug]
    await expect(page).not.toHaveURL(new RegExp(`.*${adminCtx.org.slug}/admin/ai.*`));
    await expect(page.getByText('AI Runtime Observability')).not.toBeVisible();

    // 2. Direct API negative test: Attempting to call /api/ai/jobs as non-admin returns 403 Forbidden
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join(';');
    
    const apiRes = await page.request.get(
      `http://localhost:3000/api/ai/jobs?workspaceId=${adminCtx.workspace.id}`,
      { headers: { Cookie: cookieHeader } }
    );
    expect(apiRes.status()).toBe(403);
    const body = await apiRes.json();
    expect(body.error).toContain('Admin access required');
  });
});
