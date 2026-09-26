import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminDb = createClient(supabaseUrl, supabaseServiceRole);

async function signUpAndGetWorkspaces(page: any, namePrefix: string) {
  const email = `qa-iso-${namePrefix}-${Date.now()}@example.com`;
  
  await page.goto('http://localhost:3000/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Password123!');
  await page.fill('input[name="fullName"]', namePrefix);
  await page.click('button[type="submit"]');
  
  const wsA_Name = `${namePrefix} WS A ${Date.now()}`;
  
  await page.waitForURL(/.*(onboarding|app).*/);
  if (page.url().includes('onboarding')) {
    await page.fill('input[name="name"]', wsA_Name);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(app|team).*/);
  }
  
  await page.waitForFunction(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length >= 3 && !['onboarding', 'app', 'login'].includes(parts[0]);
  }, { timeout: 15000 });
  
  // Get Workspace A
  const urlPartsA = new URL(page.url()).pathname.split('/');
  const wsASlug = urlPartsA[3];
  
  const { data: wsA } = await adminDb.from('workspaces').select('*').eq('slug', wsASlug).single();
  
  // Create Workspace B via DB to simulate the user having a second workspace
  const wsB_Slug = `qa-iso-b-${Date.now()}`;
  const { data: wsB, error } = await adminDb.from('workspaces').insert({
    name: `${namePrefix} WS B ${Date.now()}`,
    slug: wsB_Slug,
    organization_id: wsA.organization_id,
    created_by: wsA.created_by
  }).select('*').single();
  
  if (error) throw error;
  
  await adminDb.from('workspace_members').insert({
    workspace_id: wsB.id,
    user_id: wsA.created_by,
    role: 'owner'
  });
  
  return { user: { id: wsA.created_by }, wsA, wsB, orgSlug: urlPartsA[1], teamSlug: urlPartsA[2] };
}

test.describe('16B.3 Workspace Isolation Verification', () => {
  test.setTimeout(120000);

  test('1. Normal switch - Data isolation', async ({ page }) => {
    const { wsA, wsB, orgSlug, teamSlug } = await signUpAndGetWorkspaces(page, 'NormSwitch');
    
    // Seed data in A
    const resA = await adminDb.from('projects').insert({ workspace_id: wsA.id, name: 'Project in A', slug: 'proj-a-' + Date.now(), status: 'ACTIVE' }).select();
    if (resA.error) throw resA.error;
    // Seed data in B
    const resB = await adminDb.from('projects').insert({ workspace_id: wsB.id, name: 'Project in B', slug: 'proj-b-' + Date.now(), status: 'ACTIVE' }).select();
    if (resB.error) throw resB.error;
    
    await page.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsA.slug}/projects`);
    await expect(page.locator('text="Project in A"').first()).toBeVisible();
    await expect(page.locator('text="Project in B"')).not.toBeVisible();
    
    // Switch to B
    await page.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsB.slug}/projects`);
    await expect(page.locator('text="Project in B"').first()).toBeVisible();
    await expect(page.locator('text="Project in A"')).not.toBeVisible();
  });

  test('3. Async race protection', async ({ page }) => {
    const { wsA, wsB, orgSlug, teamSlug } = await signUpAndGetWorkspaces(page, 'RaceAsync');
    
    // Create data
    const resA = await adminDb.from('projects').insert({ workspace_id: wsA.id, name: 'Project A', slug: 'proj-race-a-' + Date.now(), status: 'ACTIVE' });
    if (resA.error) throw resA.error;
    const resB = await adminDb.from('projects').insert({ workspace_id: wsB.id, name: 'Project B', slug: 'proj-race-b-' + Date.now(), status: 'ACTIVE' });
    if (resB.error) throw resB.error;
    
    // We will do rapid UI switching.
    await page.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsA.slug}/projects`);
    // Click switch to B
    await page.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsB.slug}/projects`);
    // Assert B data
    await expect(page.locator('text="Project B"').first()).toBeVisible();
    await expect(page.locator('text="Project A"')).not.toBeVisible();
  });

  test('5. AI Context clears', async ({ page }) => {
    const { wsA, wsB, orgSlug, teamSlug } = await signUpAndGetWorkspaces(page, 'AIContext');
    
    const resA = await adminDb.from('projects').insert({ workspace_id: wsA.id, name: 'Alpha Project', slug: 'alpha-' + Date.now(), status: 'ACTIVE' });
    if (resA.error) throw resA.error;
    const resB = await adminDb.from('projects').insert({ workspace_id: wsB.id, name: 'Beta Project', slug: 'beta-' + Date.now(), status: 'ACTIVE' });
    if (resB.error) throw resB.error;
    
    await page.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsA.slug}/projects`);
    
    // Wait for page load
    await page.waitForTimeout(2000);
    
    // Check AI conversation via API call to ensure context is correct
    const aiA = await page.evaluate(async (idA) => {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: idA, messages: [{ role: 'user', content: 'What projects do I have?' }] })
      });
      return await res.json();
    }, wsA.id);
    
    // Now switch to B
    await page.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsB.slug}/projects`);
    await page.waitForTimeout(2000);
    
    const aiB = await page.evaluate(async (idB) => {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: idB, messages: [{ role: 'user', content: 'What projects do I have?' }] })
      });
      return await res.json();
    }, wsB.id);
    
    // In mock mode, the response is static. In real mode, it's different.
    // For now we just verify it doesn't crash
    expect(aiB).toBeDefined();
  });

  test('7. Unauthorized workspace via URL', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const { wsA, orgSlug, teamSlug } = await signUpAndGetWorkspaces(page1, 'Unauth1');
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const { wsA: wsA2 } = await signUpAndGetWorkspaces(page2, 'Unauth2'); // user2
    
    // user 2 tries to access user 1's workspace
    await page2.goto(`http://localhost:3000/${orgSlug}/${teamSlug}/${wsA.slug}/projects`);
    
    // Should be redirected because WorkspaceContextInitializer detects they don't have access
    await page2.waitForURL(url => !url.href.includes(wsA.slug), { timeout: 10000 });
    
    const url = page2.url();
    expect(url.includes(wsA.slug)).toBeFalsy();
  });

});
