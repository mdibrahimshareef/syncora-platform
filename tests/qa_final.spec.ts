import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminDb = createClient(supabaseUrl, supabaseServiceRole);

// Helper to authenticate via the UI
async function signUpAndGetWorkspace(page: any, namePrefix: string) {
  const email = `qa-${namePrefix}-${Date.now()}@example.com`;
  
  await page.goto('http://localhost:3000/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Password123!');
  await page.fill('input[name="fullName"]', namePrefix);
  await page.click('button[type="submit"]');
  
  const workspaceName = `${namePrefix} WS ${Date.now()}`;
  
  await page.waitForURL(/.*(onboarding|app).*/);
  if (page.url().includes('onboarding')) {
    await page.fill('input[name="name"]', workspaceName);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*(app|team).*/);
  }
  
  await page.waitForFunction(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length >= 3 && !['onboarding', 'app', 'login'].includes(parts[0]);
  }, { timeout: 15000 });
  
  // Return the workspace and user from DB
  const currentUrl = page.url();
  const urlParts = new URL(currentUrl).pathname.split('/');
  const wsSlug = urlParts[3]; // ['', 'orgSlug', 'teamSlug', 'wsSlug']
  
  const { data: ws, error: wsErr } = await adminDb.from('workspaces')
    .select('*')
    .eq('slug', wsSlug)
    .single();
  if (wsErr) console.error("Workspace fetch error:", wsErr);
  
  const userId = ws?.created_by;
  if (!userId) throw new Error("Could not determine user id from workspace");
  
  const { data: user, error: usrErr } = await adminDb.from('profiles').select('*').eq('id', userId).single();
  if (usrErr) console.error("User fetch error:", usrErr);
  
  return { user: user || { id: userId }, workspace: ws };
}

test.describe('Release 15 QA - Automated Final Verification', () => {
  test.setTimeout(120000);

  test('1. Timer Concurrency Verification', async ({ page }) => {
    const { user, workspace } = await signUpAndGetWorkspace(page, 'TimerTester');
    
    // Simulate 5 simultaneous POST requests to start
    const startResults = await page.evaluate(async (wsId) => {
      const promises = Array.from({ length: 5 }).map(() => 
        fetch('/api/time-entries/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: wsId, description: 'Concurrency Start' })
        })
      );
      const responses = await Promise.all(promises);
      return responses.map(r => r.status);
    }, workspace.id);
    
    const startSuccesses = startResults.filter((s: number) => s === 201).length;
    const startConflicts = startResults.filter((s: number) => s === 409).length;
    
    expect(startSuccesses).toBe(1);
    expect(startConflicts).toBe(4);
    
    // DB Verification
    const { data: activeTimers, error: dbErr1 } = await adminDb.from('time_entries').select('*').eq('user_id', user.id).is('ended_at', null);
    expect(dbErr1).toBeNull();
    expect(activeTimers?.length).toBe(1);
    
    // Simulate 5 simultaneous POST requests to stop
    const stopResults = await page.evaluate(async () => {
      const promises = Array.from({ length: 5 }).map(() => 
        fetch('/api/time-entries/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      );
      const responses = await Promise.all(promises);
      return responses.map(r => r.status);
    });
    
    const stopSuccesses = stopResults.filter((s: number) => s === 200).length;
    const stopConflicts = stopResults.filter((s: number) => s === 404 || s === 409).length;
    
    expect(stopSuccesses).toBe(1);
    expect(stopConflicts).toBe(4);
    
    // DB Verification
    const { data: finalActiveTimers, error: dbErr2 } = await adminDb.from('time_entries').select('*').eq('user_id', user.id).is('ended_at', null);
    expect(dbErr2).toBeNull();
    expect(finalActiveTimers?.length).toBe(0);
    
    const { data: completedTimers } = await adminDb.from('time_entries').select('*').eq('user_id', user.id).not('ended_at', 'is', null);
    expect(completedTimers?.length).toBe(1);
  });
  
  test('2. Budget Threshold & Idempotency Verification', async ({ page }) => {
    const { user, workspace } = await signUpAndGetWorkspace(page, 'BudgetTester');
    
    // Create a mock project
    const { data: proj, error: projErr } = await adminDb.from('projects').insert({
      workspace_id: workspace.id,
      name: 'QA Budget Project',
      slug: 'qa-budget-' + Date.now(),
      description: 'QA Budget Test'
    }).select('id').single();
    expect(projErr).toBeNull();
    expect(proj).not.toBeNull();
    
    // Set budget to 100h (6000 mins), warning 75%, critical 100%
    await page.evaluate(async ({wsId, pId}) => {
      await fetch(`/api/projects/${pId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, budgetType: 'TIME', budgetMinutes: 6000, warningThreshold: 75, criticalThreshold: 100 })
      });
    }, { wsId: workspace.id, pId: proj!.id });
    
    const insertTimeAndCheck = async (durationMinutes: number) => {
      const { status, body } = await page.evaluate(async ({wsId, pId, dur}) => {
        const r = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            workspaceId: wsId, 
            projectId: pId, 
            durationMinutes: dur, 
            startedAt: new Date(Date.now() - dur * 60000).toISOString(),
            endedAt: new Date().toISOString()
          })
        });
        return { status: r.status, body: await r.text() };
      }, { wsId: workspace.id, pId: proj!.id, dur: durationMinutes });
      
      if (status !== 201) console.error("Insert failed:", body);
      expect(status, "Insert failed with body: " + body).toBe(201); // Ensure it inserted successfully!
      
      const { data: b } = await adminDb.from('project_budgets').select('*').eq('project_id', proj!.id).single();
      return b;
    };
    
    // 74% -> No warning
    let b = await insertTimeAndCheck(4440); // 74% of 6000
    expect(b.warning_dispatched).toBe(false);
    expect(b.critical_dispatched).toBe(false);
    
    // 74 -> 75% -> Warning dispatched
    b = await insertTimeAndCheck(60); // 1% more (75% total)
    expect(b.warning_dispatched).toBe(true);
    expect(b.critical_dispatched).toBe(false);
    
    // 75 -> 76% -> No duplicate event (flags remain same)
    b = await insertTimeAndCheck(60); // 1% more (76% total)
    expect(b.warning_dispatched).toBe(true);
    expect(b.critical_dispatched).toBe(false);
    
    // 76 -> 100% -> Critical dispatched
    b = await insertTimeAndCheck(1440); // 24% more (100% total)
    expect(b.critical_dispatched).toBe(true);
    
    // 100 -> 101% -> Flags remain true
    b = await insertTimeAndCheck(60); // 101%
    expect(b.critical_dispatched).toBe(true);
    
    // Modify budget -> 200h (12000 mins). Flags should reset!
    await page.evaluate(async ({wsId, pId}) => {
      await fetch(`/api/projects/${pId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, budgetType: 'TIME', budgetMinutes: 12000, warningThreshold: 75, criticalThreshold: 100 })
      });
    }, { wsId: workspace.id, pId: proj!.id });
    
    const { data: b2 } = await adminDb.from('project_budgets').select('*').eq('project_id', proj!.id).single();
    expect(b2.warning_dispatched).toBe(false);
    expect(b2.critical_dispatched).toBe(false);
    
    // Current total is 6060 mins. New budget is 12000 (50%).
    // Insert another 3000 mins -> 9060 mins (75.5%). Warning should trigger again!
    b = await insertTimeAndCheck(3000);
    expect(b.warning_dispatched).toBe(true);
    expect(b.critical_dispatched).toBe(false);
  });
  
  test('3. RLS & AI Isolation (Cross-Workspace Security)', async ({ browser }) => {
    // Create two completely isolated contexts (users/workspaces)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    const { user: userA, workspace: wsA } = await signUpAndGetWorkspace(pageA, 'UserA');
    const { user: userB, workspace: wsB } = await signUpAndGetWorkspace(pageB, 'UserB');
    
    // User A attempts to read Timesheets for Workspace B via API
    const tsRes = await pageA.evaluate(async (wsBId) => {
      const r = await fetch(`/api/timesheets?workspaceId=${wsBId}`);
      return { status: r.status, data: await r.json().catch(()=>[]) };
    }, wsB.id);
    
    // Either 403, or 200 with empty array (since RLS filters it out)
    if (tsRes.status === 200) {
      expect(tsRes.data.length).toBe(0);
    } else {
      expect(tsRes.status).toBeGreaterThanOrEqual(400);
    }
    
    // User A attempts to write a time entry for Workspace B
    const writeRes = await pageA.evaluate(async (wsBId) => {
      const r = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsBId, durationMinutes: 60, date: new Date().toISOString() })
      });
      return { status: r.status, text: await r.text() };
    }, wsB.id);
    
    expect(writeRes.status).toBeGreaterThanOrEqual(400); // Should be 403 or 500 (RLS violation)
    
    // Test AI Context Path specifically
    const aiRes = await pageA.evaluate(async (wsBId) => {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsBId, messages: [{ role: 'user', content: 'What are the budgets?' }] })
      });
      return { status: r.status, data: await r.json().catch(()=>({})) };
    }, wsB.id);
    
    // AI route should strictly forbid access to unauthorized workspaces
    expect(aiRes.status).toBeGreaterThanOrEqual(400);
    expect(aiRes.status).toBeLessThan(500); // usually 403
  });
  
  test('4. Timesheets Workflow Verification', async ({ browser }) => {
    // We need an admin (owner) and a regular member
    const contextA = await browser.newContext();
    const pageAdmin = await contextA.newPage();
    const { user: admin, workspace } = await signUpAndGetWorkspace(pageAdmin, 'TsAdmin');
    
    const contextB = await browser.newContext();
    const pageMember = await contextB.newPage();
    
    // Create member via DB for speed, then login
    const email = `qa-tsmember-${Date.now()}@example.com`;
    const { data: memberUser } = await adminDb.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'TsMember' }
    });
    if (!memberUser?.user) throw new Error('Test setup failed: could not create member user');
    const memberId = memberUser.user.id;
    
    await adminDb.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: memberId,
      role: 'member'
    });
    
    await pageMember.goto('http://localhost:3000/login');
    await pageMember.fill('input[type="email"]', email);
    await pageMember.fill('input[type="password"]', 'Password123!');
    await pageMember.click('button[type="submit"]');
    await pageMember.waitForURL(/.*(onboarding|app|team).*/);
    
    // Step 1. Admin creates a Timesheet for the member
    const { data: ts, error: tsErr } = await adminDb.from('timesheets').insert({
      workspace_id: workspace.id,
      user_id: memberId,
      period_start: '2025-01-01',
      period_end: '2025-01-31',
      status: 'DRAFT'
    }).select('*').single();
    if (tsErr) console.error("Timesheet insert error:", tsErr);
    
    // Step 2. Member submits the timesheet
    const submitRes = await pageMember.evaluate(async ({wsId, tsId}) => {
      const r = await fetch(`/api/timesheets/${tsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, status: 'SUBMITTED' })
      });
      return { status: r.status, body: await r.text() };
    }, { wsId: workspace.id, tsId: ts.id });
    expect(submitRes.status, "Submit failed: " + submitRes.body).toBe(200);
    
    const { data: check1 } = await adminDb.from('timesheets').select('status').eq('id', ts.id).single();
    expect(check1?.status).toBe('SUBMITTED');
    
    // Step 3. Admin approves the timesheet
    const approveRes = await pageAdmin.evaluate(async ({wsId, tsId}) => {
      const r = await fetch(`/api/timesheets/${tsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, status: 'APPROVED' })
      });
      return { status: r.status, body: await r.text() };
    }, { wsId: workspace.id, tsId: ts.id });
    expect(approveRes.status, "Approve failed: " + approveRes.body).toBe(200);
    
    const { data: check2 } = await adminDb.from('timesheets').select('status').eq('id', ts.id).single();
    expect(check2?.status).toBe('APPROVED');
    
    // Step 4. Admin rejects the timesheet
    const rejectRes = await pageAdmin.evaluate(async ({wsId, tsId}) => {
      const r = await fetch(`/api/timesheets/${tsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, status: 'REJECTED', notes: 'Needs revision' })
      });
      return { status: r.status, body: await r.text() };
    }, { wsId: workspace.id, tsId: ts.id });
    expect(rejectRes.status, "Reject failed: " + rejectRes.body).toBe(200);
    
    const { data: check3 } = await adminDb.from('timesheets').select('status').eq('id', ts.id).single();
    expect(check3?.status).toBe('REJECTED');
    
    // Step 5. Member attempts to approve their own timesheet (Unauthorized!)
    const memberApproveRes = await pageMember.evaluate(async ({wsId, tsId}) => {
      const r = await fetch(`/api/timesheets/${tsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, status: 'APPROVED' })
      });
      return r.status;
    }, { wsId: workspace.id, tsId: ts.id });
    
    // Member cannot approve their own timesheet
    expect(memberApproveRes).toBeGreaterThanOrEqual(400);
    
    const { data: check4 } = await adminDb.from('timesheets').select('status').eq('id', ts.id).single();
    expect(check4?.status).not.toBe('APPROVED');
  });
});
