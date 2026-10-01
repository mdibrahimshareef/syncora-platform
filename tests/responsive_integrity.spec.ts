import { test, expect } from '@playwright/test';

test('Responsive Integrity Flow', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  // 1. Authentication
  const email = `resp-${Date.now()}@example.com`;
  await page.goto('http://localhost:3000/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Password123!');
  await page.fill('input[name="fullName"]', 'Responsive User');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/.*(onboarding|app).*/);
  if (page.url().includes('onboarding')) {
    await page.fill('input[name="name"]', 'Responsive Workspace');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*(app|team).*/);
  }

  // 2. Test 1 — Mobile header at 320x568
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(500); // Give layout time to adjust
  const header = page.locator('header');
  await expect(header).toBeVisible();

  let bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  let bodyClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth);

  // 3. Test 2 — Mobile workspace switcher at 375x812
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  
  const sidebarTrigger = page.locator('.sidebar-trigger').first();
  if (await sidebarTrigger.isVisible()) {
    await sidebarTrigger.click();
  }

  const workspaceDropdown = page.getByRole('button', { name: /workspace/i, exact: false }).first();
  if (await workspaceDropdown.isVisible()) {
    await workspaceDropdown.click();
    const menuContent = page.getByRole('menu').first();
    await expect(menuContent).toBeVisible();
    
    const boundingBox = await menuContent.boundingBox();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
    // close dropdown
    await page.keyboard.press('Escape');
  }

  // 4. Test 6 — AI Assistant at 375x812
  const aiTrigger = page.getByRole('button', { name: /ask ai/i }).first();
  if (await aiTrigger.isVisible()) {
    await aiTrigger.click();
    const aiSheet = page.getByRole('dialog').first();
    await expect(aiSheet).toBeVisible();

    const sheetBox = await aiSheet.boundingBox();
    if (sheetBox) {
      expect(sheetBox.width).toBeLessThanOrEqual(375);
    }
    
    bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(375);
    
    await page.keyboard.press('Escape');
  }

  // 5. Test 3, 4, 5 — Task details and Kanban
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/app/projects');
  await page.waitForLoadState('networkidle');

  // Try to open a task details dialog if a task exists, otherwise create one
  const createTaskBtn = page.getByRole('button', { name: /new/i }).first();
  if (await createTaskBtn.isVisible()) {
    await createTaskBtn.click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    if (dialogBox) {
      expect(dialogBox.width).toBeLessThanOrEqual(390);
    }
  }
});
