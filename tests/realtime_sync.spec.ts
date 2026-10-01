import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminDb = createClient(supabaseUrl, supabaseServiceKey);

async function signUpAndGetWorkspaces(page: any, prefix: string) {
  const email = `${prefix}-${Date.now()}@example.com`.toLowerCase();
  const password = 'Password123!';
  
  await page.goto('http://localhost:3000/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[name="fullName"]', 'Test User');
  
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*(onboarding|app|dashboard).*/);
  
  let orgSlug = `${prefix.toLowerCase()}-ws-${Date.now()}`;
  console.log(`[${prefix}] Current URL before if onboarding:`, page.url());
  if (page.url().includes('onboarding')) {
    console.log(`[${prefix}] Filling onboarding form...`);
    const orgName = `${prefix} Org ${Date.now()}`;
    await page.fill('input[name="name"]', orgName);
    await page.fill('input[name="slug"]', orgSlug);
    await page.click('button:has-text("Create Workspace")');
    console.log(`[${prefix}] Clicked Create Workspace.`);
    
    // Check for any toast error quickly
    try {
      const toast = page.locator('.toast-error, [role="alert"]').first();
      await toast.waitFor({ timeout: 2000, state: 'visible' });
      const msg = await toast.textContent();
      console.log(`[${prefix}] ONBOARDING ERROR TOAST:`, msg);
    } catch (e) {
      console.log(`[${prefix}] No error toast found.`);
    }
  } else {
    console.log(`[${prefix}] SKIPPED onboarding form fill because URL is:`, page.url());
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

test.describe.serial('16B.5 Realtime Synchronization & Cross-View Consistency', () => {

  test('1. Two-user project update', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    pageA.on('console', msg => console.log('PageA:', msg.text()));
    const ws = await signUpAndGetWorkspaces(pageA, 'UserA');
    
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    pageB.on('console', msg => console.log('PageB:', msg.text()));
    const userB = await signUpAndGetWorkspaces(pageB, 'UserB');
    
    // Invite B to A's workspace
    await adminDb.from('workspace_members').insert({ workspace_id: ws.wsId, user_id: userB.userId, role: 'member' });
    
    const projName = 'Sync Project ' + Date.now();
    const { data: proj } = await adminDb.from('projects').insert({
      workspace_id: ws.wsId,
      name: projName,
      description: 'Initial description',
      slug: 'sync-proj-' + Date.now(),
      status: 'Active',
      color: 'bg-blue-500'
    }).select().single();
    
    // B goes to A's workspace projects list
    await pageB.goto(`${ws.baseUrl}/projects`);
    // Wait for the project to appear via initial fetch
    await expect(pageB.locator(`text="${projName}"`).first()).toBeVisible();
    
    // Wait a moment for B's realtime subscription to be fully active
    await pageB.waitForTimeout(2000);
    
    // A modifies the project via the UI
    // A modifies the project via the UI
    const newName = 'Synced Update ' + Date.now();
    await pageA.goto(`${ws.baseUrl}/projects/${proj.id}`);
    
    // Open edit dialog
    await pageA.locator('button:has-text("More options")').click();
    await pageA.locator('text="Edit Project"').click();
    
    // Fill and save
    await pageA.fill('input[name="name"]', newName);
    await pageA.click('button:has-text("Save Changes")');
    
    // Wait a bit to see if B gets it
    await pageB.waitForTimeout(3000);
    
    // Log the page DOM for debugging
    const htmlB = await pageB.content();
    console.log("PAGE B HTML CONTAINS NEW NAME:", htmlB.includes(newName));
    
    // B should see the update organically without refreshing
    await pageA.screenshot({ path: 'test-results/pageA-save.png' });
    await pageB.screenshot({ path: 'test-results/pageB-wait.png' });
    await expect(pageB.locator(`text="${newName}"`).first()).toBeVisible({ timeout: 10000 });
    
    await ctxA.close();
    await ctxB.close();
  });

  test('2. Project creation', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const ws = await signUpAndGetWorkspaces(pageA, 'UserACreate');
    
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const userB = await signUpAndGetWorkspaces(pageB, 'UserBCreate');
    
    await adminDb.from('workspace_members').insert({ workspace_id: ws.wsId, user_id: userB.userId, role: 'member' });
    
    // Both users on project list
    await pageA.goto(`${ws.baseUrl}/projects`);
    await pageB.goto(`${ws.baseUrl}/projects`);
    
    // Ensure both pages are fully loaded
    await expect(pageA.locator('text="Projects"').first()).toBeVisible();
    await expect(pageB.locator('text="Projects"').first()).toBeVisible();
    await pageB.waitForTimeout(2000); // Give B time to subscribe
    
    // A creates project via UI
    await pageA.click('button:has-text("New Project")');
    const projName = 'Live Created ' + Date.now();
    await pageA.fill('input[name="name"]', projName);
    await pageA.fill('textarea[name="description"]', 'Desc');
    await pageA.click('button:has-text("Create Project")');
    
    // B should receive it without refresh
    await expect(pageB.locator(`text="${projName}"`).first()).toBeVisible({ timeout: 10000 });
    
    await ctxA.close();
    await ctxB.close();
  });

  test('3. Project deletion/archive', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const ws = await signUpAndGetWorkspaces(pageA, 'UserADel');
    
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const userB = await signUpAndGetWorkspaces(pageB, 'UserBDel');
    
    await adminDb.from('workspace_members').insert({ workspace_id: ws.wsId, user_id: userB.userId, role: 'member' });
    
    const projName = 'To Delete ' + Date.now();
    const { data: proj } = await adminDb.from('projects').insert({
      workspace_id: ws.wsId,
      name: projName,
      slug: 'del-proj-' + Date.now(),
      status: 'Active'
    }).select().single();
    
    await pageB.goto(`${ws.baseUrl}/projects`);
    await expect(pageB.locator(`text="${projName}"`).first()).toBeVisible();
    await pageB.waitForTimeout(2000); // Wait for subscription
    
    // A deletes it
    await pageA.goto(`${ws.baseUrl}/projects/${proj.id}`);
    await expect(pageA.locator(`h2:has-text("${projName}")`)).toBeVisible();
    await pageA.click('button:has-text("More options")');
    await pageA.click('text="Delete Project"');
    // Handle dialog
    await pageA.locator('#confirm-delete').fill(projName);
    await pageA.locator('[role="alertdialog"]').locator('button', { hasText: "Delete Project" }).click();
    // B should see it disappear
    await expect(pageB.locator(`text="${projName}"`).first()).toBeHidden({ timeout: 10000 });
    
    await ctxA.close();
    await ctxB.close();
  });

  test('4. Cross-workspace realtime isolation', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const wsA = await signUpAndGetWorkspaces(pageA, 'UserAIso');
    
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const wsB = await signUpAndGetWorkspaces(pageB, 'UserBIso');
    
    // A is on A's projects. B is on B's projects.
    await pageB.goto(`${wsB.baseUrl}/projects`);
    console.log('wsB.baseUrl:', wsB.baseUrl);
    console.log('pageB.url():', pageB.url());
    await pageB.screenshot({ path: 'scratch/test4-debug.png' });
    await expect(pageB.locator('text="Projects"').first()).toBeVisible();
    await pageB.waitForTimeout(2000);
    
    const projName = 'Leak Test ' + Date.now();
    // A creates project in A directly
    await adminDb.from('projects').insert({
      workspace_id: wsA.wsId,
      name: projName,
      slug: 'leak-proj-' + Date.now(),
      status: 'Active'
    });
    
    // Wait and verify B does NOT see it
    await pageB.waitForTimeout(3000);
    await expect(pageB.locator(`text="${projName}"`).first()).toBeHidden();
    
    await ctxA.close();
    await ctxB.close();
  });

});
