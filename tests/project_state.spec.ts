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
  await page.waitForURL(/.*(onboarding|app).*/);
  
  let orgSlug = `${prefix.toLowerCase()}-org-${Date.now()}`;
  if (page.url().includes('onboarding')) {
    const orgName = `${prefix} Org ${Date.now()}`;
    await page.fill('input[name="name"]', orgName);
    await page.fill('input[name="slug"]', orgSlug);
    await page.click('button:has-text("Create Workspace")');
  }
  
  let url = page.url();
  let retries = 0;
  while((url.includes('signup') || url.includes('onboarding') || url.includes('/app')) && retries < 15) {
    await page.waitForTimeout(1000);
    url = page.url();
    retries++;
  }
  
  // Retrieve workspace ID from DB
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
  
  // In previous versions it was orgSlug/teamSlug/wsSlug, but now we don't know the exact URL. Let's just use the URL it landed on!
  url = page.url();
  return { email, password, url, wsId, userId: user!.id };
}

test.describe('16B.4 Project State Integrity', () => {

  test('1. Project Update Propagation', async ({ page }) => {
    const { url, wsId } = await signUpAndGetWorkspaces(page, 'ProjUpdate');
    
    // Create a project in DB directly to test UI update
    const projName = 'Initial Project ' + Date.now();
    const projRes = await adminDb.from('projects').insert({
      workspace_id: wsId,
      name: projName,
      slug: 'proj-' + Date.now(),
      status: 'Active'
    }).select().single();
    if (projRes.error) throw projRes.error;
    
    const projectId = projRes.data.id;
    
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    await page.goto(`${baseUrl}/projects/${projectId}`);
    
    // Wait for it to render
    await expect(page.locator(`text="${projName}"`).first()).toBeVisible();
    
    // Edit the project
    await page.click('button:has-text("More options")'); // Open dropdown
    await page.click('text="Edit Project"');
    
    // Fill form
    const newName = 'Updated Project ' + Date.now();
    await page.fill('input[name="name"]', newName);
    await page.fill('textarea[name="description"]', 'Updated description');
    
    // Check if network is disconnected or fails in the mock (we will just submit normally)
    await page.click('button:has-text("Save Changes")');
    
    // Expect project title to change
    await expect(page.locator(`h2:has-text("${newName}")`)).toBeVisible();
    
    // Now verify the sidebar also has the new name instantly without refresh
    await expect(page.locator(`[data-sidebar="sidebar"] >> text="${newName}"`).first()).toBeVisible();
    
    // Navigate back to project list
    await page.goto(`${baseUrl}/projects`);
    await expect(page.locator(`text="${newName}"`).first()).toBeVisible();
  });

  test('2. Async Error Rollback', async ({ page }) => {
    const { url, wsId } = await signUpAndGetWorkspaces(page, 'ProjRollback');
    
    // We will intercept the update request and force a failure
    await page.route('**/rest/v1/projects?*', async route => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({ status: 500, body: JSON.stringify({ message: "Simulated error" }) });
      } else {
        route.continue();
      }
    });

    const projName = 'Stable Project ' + Date.now();
    const projRes = await adminDb.from('projects').insert({
      workspace_id: wsId,
      name: projName,
      slug: 'proj-stable-' + Date.now(),
      status: 'Active'
    }).select().single();
    if (projRes.error) throw projRes.error;
    
    const projectId = projRes.data.id;
    
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    await page.goto(`${baseUrl}/projects/${projectId}`);
    await expect(page.locator(`text="${projName}"`).first()).toBeVisible();
    
    // Edit
    await page.click('button:has-text("More options")');
    await page.click('text="Edit Project"');
    
    const newName = 'Failing Update ' + Date.now();
    await page.fill('input[name="name"]', newName);
    await page.fill('textarea[name="description"]', 'Updated description');
    await page.click('button:has-text("Save Changes")');
    
    // We expect a toast error
    await expect(page.locator('text=An error occurred while saving')).toBeVisible();
    
    // Close the dialog so the background is not aria-hidden
    await page.getByRole('button', { name: 'Close' }).first().click();
    await page.click('button:has-text("Discard")');
    
    // IT MUST REVERT BACK TO THE ORIGINAL NAME
    await expect(page.locator(`h2:has-text("${projName}")`)).toBeVisible({ timeout: 5000 });
  });

});
