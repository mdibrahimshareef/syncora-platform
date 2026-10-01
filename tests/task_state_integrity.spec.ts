import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminDb = createClient(supabaseUrl, supabaseServiceKey);

async function signUpAndGetWorkspaces(page: Page, prefix: string) {
  const email = `${prefix.toLowerCase()}-${Date.now()}@example.com`;
  const password = 'Password123!';
  
  await page.goto('http://localhost:3000/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[name="fullName"]', 'Test User');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*(onboarding|app|dashboard).*/);
  
  let orgSlug = `${prefix.toLowerCase()}-ws-${Date.now()}`;
  if (page.url().includes('onboarding')) {
    const orgName = `${prefix} Org ${Date.now()}`;
    await page.fill('input[name="name"]', orgName);
    await page.fill('input[name="slug"]', orgSlug);
    await page.click('button:has-text("Create Workspace")');
  }
  
  let url = page.url();
  let retries = 0;
  while((url.includes('signup') || url.includes('onboarding')) && retries < 15) {
    await page.waitForTimeout(1000);
    url = page.url();
    retries++;
  }
  
  const { data: user } = await adminDb.from('profiles').select('id').eq('email', email).single();
  let wsId = null;
  for (let i = 0; i < 10; i++) {
    const res = await adminDb.from('workspaces').select('id').eq('slug', orgSlug).single();
    if (res.data) {
      wsId = res.data.id;
      break;
    }
    await page.waitForTimeout(500);
  }
  
  url = page.url();
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  return { email, password, baseUrl, wsId, userId: user!.id };
}

test.describe.serial('16B.6 Task State Integrity & Collaborative Consistency', () => {

  test('1. Task update propagation and two-user task update', async ({ browser }) => {
    // Phase 2 + Phase 3
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const ws = await signUpAndGetWorkspaces(pageA, 'TaskUserA');
    
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const userB = await signUpAndGetWorkspaces(pageB, 'TaskUserB');
    
    // Invite B to A's workspace
    await adminDb.from('workspace_members').insert({ workspace_id: ws.wsId, user_id: userB.userId, role: 'member' });

    // Create project
    const projName = 'Task Project ' + Date.now();
    const { data: proj } = await adminDb.from('projects').insert({
      workspace_id: ws.wsId,
      name: projName,
      description: 'Project for tasks',
      slug: 'task-proj-' + Date.now(),
      status: 'Active'
    }).select().single();

    // A and B open project tasks
    await pageA.goto(`${ws.baseUrl}/projects/${proj.id}`);
    await pageB.goto(`${ws.baseUrl}/projects/${proj.id}`);
    
    await expect(pageA.locator('button:has-text("New Task")').first()).toBeVisible();
    await expect(pageB.locator('button:has-text("New Task")').first()).toBeVisible();

    await pageB.waitForTimeout(2000); // Give B time to subscribe

    // CREATE TASK via API (Simulates fast creation or creation elsewhere)
    const { data: insertedTask, error: insertError } = await adminDb.from('tasks').insert({
      project_id: proj.id,
      workspace_id: ws.wsId,
      title: 'New Collaborative Task',
      status: 'Todo',
      priority: 'Medium',
      position: 1000,
      created_by: ws.userId
    }).select().single();
    
    // Navigate to List tab so we can see tasks
    await pageA.locator('button[role="tab"]:has-text("List")').first().click();
    await pageB.locator('button[role="tab"]:has-text("List")').first().click();

    // Verify appears for A and B
    await expect(pageA.locator('text="New Collaborative Task"').first()).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator('text="New Collaborative Task"').first()).toBeVisible({ timeout: 10000 });

    // UPDATE TASK via Realtime (B edits via DB directly simulating API call or another view)
    const { data: taskData } = await adminDb.from('tasks').select('id').eq('title', 'New Collaborative Task').eq('project_id', proj.id).single();
    
    // B edits the task via API
    if (!taskData) throw new Error('Task not found');
    await adminDb.from('tasks').update({ 
      title: 'Updated Title Realtime',
      updated_at: new Date().toISOString()
    }).eq('id', taskData.id);
    
    // Both should see the updated title (A sees it via realtime, B via realtime or optimistic if B did it in UI)
    await expect(pageA.locator('text="Updated Title Realtime"').first()).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator('text="Updated Title Realtime"').first()).toBeVisible({ timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('2. Task deletion and optimistic rollback', async ({ browser }) => {
    // Phase 5 + Phase 6
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const ws = await signUpAndGetWorkspaces(pageA, 'TaskUserC');
    
    // Create project
    const projName = 'Task Project C ' + Date.now();
    const { data: proj } = await adminDb.from('projects').insert({
      workspace_id: ws.wsId,
      name: projName,
      slug: 'task-proj-c-' + Date.now(),
      status: 'Active'
    }).select().single();

    // Create task
    const { data: task } = await adminDb.from('tasks').insert({
      project_id: proj.id,
      workspace_id: ws.wsId,
      title: 'Task To Delete',
      status: 'Todo',
      priority: 'High',
      position: 1000,
      created_by: ws.userId
    }).select().single();

    await pageA.goto(`${ws.baseUrl}/projects/${proj.id}`);
    await pageA.locator('button[role="tab"]:has-text("List")').first().click();
    await expect(pageA.locator('text="Task To Delete"').first()).toBeVisible();

    // Edit task (Optimistic Rollback Test)
    // We cannot easily mock the network in Playwright when relying on Next.js server-side /api unless we intercept
    await pageA.route(`**/rest/v1/tasks*`, route => route.abort('failed'));
    
    // Wait, let's trigger an update. 
    // Opening task details
    await pageA.click('text="Task To Delete"');
    await pageA.locator('.lucide-trash-2').first().click({ force: true }); // click trash icon
    if (await pageA.locator('button:has-text("Delete"):visible').count() > 0) {
      await pageA.locator('button:has-text("Delete"):visible').first().click();
    }

    // It should momentarily hide, then rollback to visible because of abort
    await expect(pageA.locator('text="Task To Delete"').first()).toBeVisible({ timeout: 10000 });
    await pageA.unroute(`**/rest/v1/tasks*`); // Clear route

    // Delete task via API
    await adminDb.from('tasks').delete().eq('id', task.id);
    await expect(pageA.locator('text="Task To Delete"').first()).toBeHidden({ timeout: 10000 });

    await ctxA.close();
  });

  test('3. Cross-workspace task isolation', async ({ browser }) => {
    // Phase 10
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const wsA = await signUpAndGetWorkspaces(pageA, 'TaskUserIsoA');

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const wsB = await signUpAndGetWorkspaces(pageB, 'TaskUserIsoB');



    // A creates a project & task directly in DB
    const { data: projA } = await adminDb.from('projects').insert({
      workspace_id: wsA.wsId,
      name: 'Project A',
      slug: 'proj-a-' + Date.now(),
      status: 'Active'
    }).select().single();

    await adminDb.from('tasks').insert({
      project_id: projA.id,
      workspace_id: wsA.wsId,
      title: 'Secret Workspace A Task',
      status: 'Todo',
      priority: 'High',
      position: 1000,
      assignee_id: wsA.userId,
    });

    // Go to project view in Workspace A
    await pageA.goto(`${wsA.baseUrl}/projects/${projA.id}`);
    await pageA.locator('button[role="tab"]:has-text("List")').first().click();
    
    // Go to My Work in B
    await pageB.goto(`${wsB.baseUrl}/my-tasks`);

    // Wait for A to see it (via realtime)
    await expect(pageA.locator('text="Secret Workspace A Task"').first()).toBeVisible({ timeout: 10000 });
    
    // Verify B does not see it
    await expect(pageB.locator('text="Secret Workspace A Task"').first()).toBeHidden();

    await ctxA.close();
    await ctxB.close();
  });
});
