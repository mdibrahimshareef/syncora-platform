import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminDb = createClient(supabaseUrl, supabaseServiceRole);

// We need a helper to signup two isolated users and workspaces
async function createIsolatedUser(prefix: string) {
  const email = `ai-${prefix}-${Date.now()}@example.com`;
  const { data: authData, error: authError } = await adminDb.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true
  });
  if (authError) throw authError;

  const user = authData.user;
  
  // Update profile
  await adminDb.from('profiles').update({ full_name: prefix }).eq('id', user.id);

  // Create organization
  const { data: org, error: orgError } = await adminDb.from('organizations').insert({
    name: `${prefix} Organization`,
    slug: prefix.toLowerCase() + '-org-' + Date.now(),
    owner_id: user.id
  }).select().single();
  if (orgError) throw orgError;

  // Create workspace
  const { data: ws, error: wsError } = await adminDb.from('workspaces').insert({
    name: `${prefix} Workspace`,
    slug: prefix.toLowerCase() + '-' + Date.now(),
    organization_id: org.id,
    created_by: user.id
  }).select().single();
  if (wsError) throw wsError;

  // Add member
  await adminDb.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner'
  });
  
  // Create project
  const { data: proj, error: projError } = await adminDb.from('projects').insert({
    name: 'Test Project',
    slug: 'test-project-' + Date.now(),
    workspace_id: ws.id,
    status: 'Active',
    created_by: user.id
  }).select().single();
  if (projError) throw projError;

  return { user, workspace: ws, project: proj, email, password: 'Password123!' };
}

test.describe('AI Action RLS Verification', () => {
  let uA: any, uB: any;

  test.beforeAll(async () => {
    uA = await createIsolatedUser('userA');
    uB = await createIsolatedUser('userB');
  });

  test('User A can create task in Workspace A, but fails in Workspace B', async ({ page }) => {
    // 1. Login as User A
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', uA.email);
    await page.fill('input[type="password"]', uA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(app|team).*/);
    
    // Retrieve the session cookie to make API requests as User A
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join(';');
    
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Cookie': cookieString,
    };
    
    const runAction = async (workspaceId: string, actionId: string) => {
      const response = await page.request.post('http://localhost:3000/api/ai/action/execute', {
        headers: reqHeaders,
        data: {
          workspaceId,
          toolName: 'create_task',
          actionId,
          args: { title: 'AI Task A', priority: 'High', projectId: uA.project.id }
        }
      });
      return { status: response.status(), json: await response.json() };
    };

    // Valid: User A -> Workspace A
    const resA = await runAction(uA.workspace.id, `act-create-${Date.now()}`);
    expect(resA.status).toBe(200);
    expect(resA.json.status).toBe('completed');
    expect(resA.json.data.title).toBe('AI Task A');

    // Invalid: User A -> Workspace B
    const resB = await runAction(uB.workspace.id, `act-create-${Date.now()}`);
    expect(resB.status).toBe(403);
    expect(resB.json.status).toBe('denied');
  });

  test('User B cannot assign task to User A or in Workspace A', async ({ page }) => {
    // 1. Login as User B
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', uB.email);
    await page.fill('input[type="password"]', uB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(app|team).*/);

    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join(';');

    const reqHeaders = {
      'Content-Type': 'application/json',
      'Cookie': cookieString,
    };

    // First create a task in Workspace B for User B to use
    const { data: taskB } = await adminDb.from('tasks').insert({
      project_id: uB.project.id,
      workspace_id: uB.workspace.id,
      title: 'Task B',
      status: 'Todo',
      priority: 'Low',
      position: 0
    }).select().single();

    // Invalid: User B tries to assign User A (Workspace A member) to Task B
    const resB = await page.request.post('http://localhost:3000/api/ai/action/execute', {
      headers: reqHeaders,
      data: {
        workspaceId: uB.workspace.id,
        toolName: 'assign_task',
        actionId: `act-assign-${Date.now()}`,
        args: { taskId: taskB.id, assigneeId: uA.user.id }
      }
    });
    const resBJson = await resB.json();
    
    // Should be denied because User A is not in Workspace B
    expect(resB.status()).toBe(200); // Route returns 200 with status: denied
    expect(resBJson.status).toBe('denied');
  });

  test('Idempotency allows duplicate requests but blocks conflicts', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', uA.email);
    await page.fill('input[type="password"]', uA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(app|team).*/);

    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join(';');

    const reqHeaders = {
      'Content-Type': 'application/json',
      'Cookie': cookieString,
    };

    const actionId = `act-idem-${Date.now()}`;
    
    // Request 1: succeeds
    const res1 = await page.request.post('http://localhost:3000/api/ai/action/execute', {
      headers: reqHeaders,
      data: {
        workspaceId: uA.workspace.id,
        toolName: 'create_task',
        actionId: actionId,
        args: { title: 'Idempotent Task', priority: 'High', projectId: uA.project.id }
      }
    });
    expect(res1.status()).toBe(200);

    // Request 2: duplicate, should return already_executed
    const res2 = await page.request.post('http://localhost:3000/api/ai/action/execute', {
      headers: reqHeaders,
      data: {
        workspaceId: uA.workspace.id,
        toolName: 'create_task',
        actionId: actionId,
        args: { title: 'Idempotent Task', priority: 'High', projectId: uA.project.id }
      }
    });
    const json2 = await res2.json();
    expect(json2.status).toBe('already_executed');
  });
});
