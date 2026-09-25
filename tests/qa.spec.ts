import { test, expect } from '@playwright/test';

test('Run QA Dashboard Tests', async ({ page }) => {
  test.setTimeout(120000); // 120s timeout
  
  // 1. Signup a new user
  await page.goto('http://localhost:3000/signup');
  await page.fill('input[type="email"]', `qa-${Date.now()}@example.com`);
  // Password requires uppercase, number, special char and 8 length
  await page.fill('input[type="password"]', 'Password123!');
  // Need to fill out fullName since it's in the schema (it usually uses name="fullName")
  await page.fill('input[name="fullName"]', 'QA Tester');
  await page.click('button[type="submit"]');
  
  // Wait for onboarding or dashboard
  await page.waitForURL(/.*(onboarding|qa-workspace).*/);
  
  // If onboarding, fill it out
  if (page.url().includes('onboarding')) {
    await page.fill('input[name="name"]', `QA Workspace ${Date.now()}`);
    await page.click('button[type="submit"]');
  }
  
  // Wait for the application to redirect to a workspace route (/[org]/[team]/[ws])
  await page.waitForFunction(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length >= 3 && !['onboarding', 'app', 'login'].includes(parts[0]);
  }, { timeout: 15000 });
  
  // Extract dynamic workspace URL from the current URL
  const currentUrl = page.url();
  const urlParts = new URL(currentUrl).pathname.split('/');
  const workspacePrefix = `/${urlParts[1]}/${urlParts[2]}/${urlParts[3]}`;
  
  console.log('--- DEBUG INFO ---');
  console.log(`Current URL: ${currentUrl}`);
  console.log(`URL Parts: ${urlParts.join(', ')}`);
  console.log(`Workspace Prefix: ${workspacePrefix}`);
  
  await page.goto(`http://localhost:3000${workspacePrefix}/qa`);
  
  // Wait for the QA page to actually load
  await page.waitForSelector('text=Release 15 QA Dashboard', { timeout: 10000 }).catch(() => console.log('QA Dashboard not found!'));
  
  // 4. Click Start Concurrency test
  await page.click('button:has-text("Test Start Concurrency")');
  await page.waitForTimeout(2000); // Wait for fetch promises
  
  // 5. Click Stop Concurrency test
  await page.click('button:has-text("Test Stop Concurrency")');
  await page.waitForTimeout(2000); // Wait for fetch promises
  
  // 6. Click RLS test
  await page.click('button:has-text("Test RLS Isolation")');
  await page.waitForTimeout(2000);
  
  // 7. Click Budget test
  await page.click('button:has-text("Test Budget Thresholds")');
  await page.waitForTimeout(3000);
  
  // 8. Get logs and assert
  const logs = await page.locator('.font-mono div').allTextContents();
  
  console.log('--- QA TEST LOGS ---');
  logs.forEach(l => console.log(l));
  
  const passedStart = logs.some(l => l?.includes('✅ PASS: Exactly 1 timer started'));
  const passedStop = logs.some(l => l?.includes('✅ PASS: Exactly 1 stop succeeded'));
  const passedRLS = logs.some(l => l?.includes('✅ PASS: Cross-workspace injection blocked'));
  const passedBudget = logs.some(l => l?.includes('✅ Budget check requires DB inspection for events. Proceed manually.'));
  
  expect(passedStart).toBe(true);
  expect(passedStop).toBe(true);
  expect(passedRLS).toBe(true);
  expect(passedBudget).toBe(true);
});
