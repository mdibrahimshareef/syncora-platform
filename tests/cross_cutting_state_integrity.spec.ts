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
    await new Promise(r => setTimeout(r, 500));
  }

  // Parse the current URL after onboarding finishes
  const finalPath = new URL(page.url()).pathname;
  
  return { 
    userId: user?.id, 
    wsId, 
    orgSlug,
    baseUrl: finalPath.replace('/my-work', '').replace('/dashboard', '')
  };
}

test.describe('16B.7 Cross-Cutting State Integrity', () => {

  test('1. Notifications workspace isolation', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const wsA = await signUpAndGetWorkspaces(pageA, 'NotifUserA');
    console.log('wsA.baseUrl:', wsA.baseUrl);
    // User also has a second workspace in the same org
    const { data: wsAData } = await adminDb.from('workspaces').select('organization_id, team_id').eq('id', wsA.wsId).single();
    if (!wsAData) throw new Error('wsAData not found');
    
    const { data: wsB, error: wsBError } = await adminDb.from('workspaces').insert({
      organization_id: wsAData.organization_id,
      team_id: wsAData.team_id,
      name: `NotifUserA Workspace B`,
      slug: `notifa-ws-b-${Date.now()}`
    }).select().single();
    if (wsBError) throw wsBError;
    await adminDb.from('workspace_members').insert({ workspace_id: wsB.id, user_id: wsA.userId, role: 'owner' });

    // Create a notification in Workspace A
    const { error: notifError } = await adminDb.from('notifications').insert({
      workspace_id: wsA.wsId,
      recipient_id: wsA.userId,
      actor_id: wsA.userId,
      type: 'TASK_ASSIGNED',
      entity_type: 'task',
      entity_id: '00000000-0000-0000-0000-000000000000',
      metadata: { task_title: 'Workspace A specific notification' }
    });
    if (notifError) throw notifError;

    // Go to Workspace B
    const orgSlugParsed = wsA.baseUrl.split('/')[1];
    await pageA.goto(`http://localhost:3000/${orgSlugParsed}/team/${wsB.slug}/my-tasks`);
    await pageA.waitForTimeout(2000);
    await pageA.screenshot({ path: 'test-wsb-loaded.png' });
    
    // Open notifications panel
    await pageA.locator('button:has(.lucide-bell)').first().click();
    
    // Should NOT see Workspace A's notification
    await expect(pageA.locator('text="Workspace A specific notification"')).toBeHidden({ timeout: 5000 });
    
    // Go to Workspace A
    await pageA.goto(`http://localhost:3000${wsA.baseUrl}/my-tasks`);
    await pageA.locator('button:has(.lucide-bell)').first().click();
    await pageA.waitForTimeout(2000);
    await pageA.screenshot({ path: 'test-wsa-notification-panel.png' });
    await expect(pageA.locator('text="Workspace A specific notification"').first()).toBeVisible({ timeout: 5000 });

    await ctxA.close();
  });

  test('2. Search async race condition workspace isolation', async ({ browser }) => {
    // We want to test that a slow search request from Workspace A
    // doesn't resolve and populate the search results in Workspace B
    
    // We can simulate this by intercepting the /rest/v1/rpc/global_search endpoint
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const wsA = await signUpAndGetWorkspaces(pageA, 'SearchUser');
    
    // Create Workspace B
    const { data: wsAData, error: wsAError } = await adminDb.from('workspaces').select('organization_id, team_id').eq('id', wsA.wsId).single();
    if (wsAError || !wsAData) throw wsAError || new Error('Workspace A not found');
    
    const { data: wsB, error: wsBError } = await adminDb.from('workspaces').insert({
      organization_id: wsAData.organization_id,
      team_id: wsAData.team_id,
      name: `SearchUser Workspace B`,
      slug: `search-ws-b-${Date.now()}`
    }).select().single();
    if (wsBError) throw wsBError;
    await adminDb.from('workspace_members').insert({ workspace_id: wsB.id, user_id: wsA.userId, role: 'owner' });

    // Go to Workspace A
    await pageA.goto(`http://localhost:3000${wsA.baseUrl}/my-tasks`);
    
    // Intercept search API and delay it
    let searchIntercepted = false;
    await pageA.route('**/rest/v1/rpc/global_search', async route => {
      searchIntercepted = true;
      // Delay the response
      await new Promise(r => setTimeout(r, 2000));
      // Return a fake search result for Workspace A
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          type: 'task',
          id: '123',
          title: 'Stale Workspace A Task',
          description: '',
          link: '/projects/123?task=123',
          project_id: '123'
        }])
      });
    });

    // Trigger search in A
    // First click the search button
    await pageA.locator('text="Search this workspace..."').first().click();
    
    // Then fill the command dialog input
    await pageA.locator('input[placeholder*="Search tasks, projects"]').fill('Stale');
    
    // Immediately switch to Workspace B before the search resolves
    const orgSlugParsed = wsA.baseUrl.split('/')[1];
    await pageA.goto(`http://localhost:3000/${orgSlugParsed}/team/${wsB.slug}/my-tasks`);
    
    // Wait for the interception to trigger and the timeout to finish
    await pageA.waitForTimeout(3000);
    
    // Verify we are in Workspace B and don't see the stale search result
    await expect(pageA.locator('text="Stale Workspace A Task"')).toBeHidden({ timeout: 5000 });

    await ctxA.close();
  });

  test('3. Activity stream workspace isolation', async ({ browser }) => {
    // Similar isolation check for activity stream
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const wsA = await signUpAndGetWorkspaces(pageA, 'ActivityUser');
    
    const { data: wsAData } = await adminDb.from('workspaces').select('organization_id, team_id').eq('id', wsA.wsId).single();
    const { data: wsB, error: wsBError } = await adminDb.from('workspaces').insert({
      organization_id: wsAData!.organization_id,
      team_id: wsAData!.team_id,
      name: `ActivityUser Workspace B`,
      slug: `activity-ws-b-${Date.now()}`
    }).select().single();
    if (wsBError) throw wsBError;
    await adminDb.from('workspace_members').insert({ workspace_id: wsB.id, user_id: wsA.userId, role: 'owner' });

    // Insert a project for Workspace A so the Dashboard empty state is bypassed
    const { data: projectA, error: pError } = await adminDb.from('projects').insert({
      workspace_id: wsA.wsId,
      name: 'Workspace A Project',
      slug: 'ws-a-project',
      status: 'active'
    }).select().single();
    if (pError) throw pError;

    // Insert an activity for Workspace A
    const { error: activityError } = await adminDb.from('activities').insert({
      workspace_id: wsA.wsId,
      actor_id: wsA.userId,
      action: 'created_task',
      entity_type: 'task',
      entity_id: '11111111-1111-1111-1111-111111111111',
      metadata: { targetName: 'Workspace A Secret Activity' }
    });
    if (activityError) throw activityError;

    // Go to Workspace B
    const orgSlugParsed = wsA.baseUrl.split('/')[1];
    
    // Activity stream is usually shown on the Dashboard or Home page
    // The Home route is just /
    await pageA.goto(`http://localhost:3000/${orgSlugParsed}/team/${wsB.slug}`);
    
    // Should NOT see Workspace A's activity
    await expect(pageA.locator('text="Workspace A Secret Activity"')).toBeHidden({ timeout: 5000 });
    
    // Go back to Workspace A, should see it
    await pageA.goto(`http://localhost:3000${wsA.baseUrl}`);
    
    await pageA.waitForTimeout(2000);
    await pageA.screenshot({ path: 'test-wsa-activity.png' });
    
    // Wait for the text to be visible in Workspace A
    await expect(pageA.locator('text="Workspace A Secret Activity"').first()).toBeVisible({ timeout: 5000 });

    await ctxA.close();
  });

});
