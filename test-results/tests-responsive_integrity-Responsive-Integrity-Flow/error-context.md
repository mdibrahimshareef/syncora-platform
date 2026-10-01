# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\responsive_integrity.spec.ts >> Responsive Integrity Flow
- Location: tests\responsive_integrity.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/signup
Call log:
  - navigating to "http://localhost:3000/signup", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Responsive Integrity Flow', async ({ page }) => {
  4  |   test.setTimeout(120000); // 2 minutes
  5  | 
  6  |   // 1. Authentication
  7  |   const email = `resp-${Date.now()}@example.com`;
> 8  |   await page.goto('http://localhost:3000/signup');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/signup
  9  |   await page.fill('input[type="email"]', email);
  10 |   await page.fill('input[type="password"]', 'Password123!');
  11 |   await page.fill('input[name="fullName"]', 'Responsive User');
  12 |   await page.click('button[type="submit"]');
  13 |   
  14 |   await page.waitForURL(/.*(onboarding|app).*/);
  15 |   if (page.url().includes('onboarding')) {
  16 |     await page.fill('input[name="name"]', 'Responsive Workspace');
  17 |     await page.click('button[type="submit"]');
  18 |     await page.waitForURL(/.*(app|team).*/);
  19 |   }
  20 | 
  21 |   // 2. Test 1 — Mobile header at 320x568
  22 |   await page.setViewportSize({ width: 320, height: 568 });
  23 |   await page.waitForTimeout(500); // Give layout time to adjust
  24 |   const header = page.locator('header');
  25 |   await expect(header).toBeVisible();
  26 | 
  27 |   let bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  28 |   let bodyClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  29 |   expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth);
  30 | 
  31 |   // 3. Test 2 — Mobile workspace switcher at 375x812
  32 |   await page.setViewportSize({ width: 375, height: 812 });
  33 |   await page.waitForTimeout(500);
  34 |   
  35 |   const sidebarTrigger = page.locator('.sidebar-trigger').first();
  36 |   if (await sidebarTrigger.isVisible()) {
  37 |     await sidebarTrigger.click();
  38 |   }
  39 | 
  40 |   const workspaceDropdown = page.getByRole('button', { name: /workspace/i, exact: false }).first();
  41 |   if (await workspaceDropdown.isVisible()) {
  42 |     await workspaceDropdown.click();
  43 |     const menuContent = page.getByRole('menu').first();
  44 |     await expect(menuContent).toBeVisible();
  45 |     
  46 |     const boundingBox = await menuContent.boundingBox();
  47 |     if (boundingBox) {
  48 |       expect(boundingBox.width).toBeLessThanOrEqual(375);
  49 |     }
  50 |     // close dropdown
  51 |     await page.keyboard.press('Escape');
  52 |   }
  53 | 
  54 |   // 4. Test 6 — AI Assistant at 375x812
  55 |   const aiTrigger = page.getByRole('button', { name: /ask ai/i }).first();
  56 |   if (await aiTrigger.isVisible()) {
  57 |     await aiTrigger.click();
  58 |     const aiSheet = page.getByRole('dialog').first();
  59 |     await expect(aiSheet).toBeVisible();
  60 | 
  61 |     const sheetBox = await aiSheet.boundingBox();
  62 |     if (sheetBox) {
  63 |       expect(sheetBox.width).toBeLessThanOrEqual(375);
  64 |     }
  65 |     
  66 |     bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  67 |     expect(bodyScrollWidth).toBeLessThanOrEqual(375);
  68 |     
  69 |     await page.keyboard.press('Escape');
  70 |   }
  71 | 
  72 |   // 5. Test 3, 4, 5 — Task details and Kanban
  73 |   await page.setViewportSize({ width: 390, height: 844 });
  74 |   await page.goto('http://localhost:3000/app/projects');
  75 |   await page.waitForLoadState('networkidle');
  76 | 
  77 |   // Try to open a task details dialog if a task exists, otherwise create one
  78 |   const createTaskBtn = page.getByRole('button', { name: /new/i }).first();
  79 |   if (await createTaskBtn.isVisible()) {
  80 |     await createTaskBtn.click();
  81 |     const dialog = page.getByRole('dialog').first();
  82 |     await expect(dialog).toBeVisible();
  83 | 
  84 |     const dialogBox = await dialog.boundingBox();
  85 |     if (dialogBox) {
  86 |       expect(dialogBox.width).toBeLessThanOrEqual(390);
  87 |     }
  88 |   }
  89 | });
  90 | 
```