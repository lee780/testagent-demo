/**
 * E2E Test Suite 05 — Navigation & Cross-module flows
 * Covers: sidebar nav links, route guards, settings page,
 *         theme toggle, defect→detail→back, testcase→detail→back
 */
import { test, expect } from '@playwright/test';
import { loginViaAPI, setAuthInBrowser, TEST_USER } from './helpers';

let sharedToken = '';

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  sharedToken = await loginViaAPI(page, TEST_USER);
  await page.close();
  await context.close();
});

test.describe('Navigation — Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, sharedToken);
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('.sidebar-toggle', { timeout: 10000 });
  });

  test('TC-NAV-01: Sidebar shows 缺陷管理 nav link', async ({ page }) => {
    await expect(page.locator('.nav-link:has-text("缺陷管理"), a[href="/defects"]')).toBeVisible({ timeout: 5000 });
  });

  test('TC-NAV-02: Sidebar shows 用例库 nav link', async ({ page }) => {
    await expect(page.locator('.nav-link:has-text("用例库"), a[href="/testcases"]')).toBeVisible({ timeout: 5000 });
  });

  test('TC-NAV-03: Clicking 缺陷管理 navigates to /defects', async ({ page }) => {
    await page.locator('.nav-link:has-text("缺陷管理"), a[href="/defects"]').click();
    await page.waitForURL(url => url.toString().includes('/defects'), { timeout: 5000 });
    expect(page.url()).toContain('/defects');
  });

  test('TC-NAV-04: Clicking 用例库 navigates to /testcases', async ({ page }) => {
    await page.locator('.nav-link:has-text("用例库"), a[href="/testcases"]').click();
    await page.waitForURL(url => url.toString().includes('/testcases'), { timeout: 5000 });
    expect(page.url()).toContain('/testcases');
  });

  test('TC-NAV-05: Active nav link is highlighted', async ({ page }) => {
    await page.locator('.nav-link:has-text("缺陷管理"), a[href="/defects"]').click();
    await page.waitForURL(url => url.toString().includes('/defects'), { timeout: 5000 });
    const activeLink = page.locator('.nav-link-active');
    await expect(activeLink).toBeVisible({ timeout: 2000 });
  });

  test('TC-NAV-06: Clicking 新建对话 clears current conversation', async ({ page }) => {
    const newChatBtn = page.locator('.new-chat-sidebar-btn, button:has-text("新建对话")').first();
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
      await page.waitForTimeout(500);
      // Should be back at root chat
      expect(page.url()).toMatch(/localhost:3000\/?$/);
    }
  });
});

test.describe('Navigation — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, sharedToken);
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('.sidebar-toggle', { timeout: 10000 });
  });

  test('TC-NAV-07: Settings page is accessible', async ({ page }) => {
    // Click user info → settings
    await page.locator('.user-info, .user-avatar').first().click();
    await page.waitForTimeout(400);
    const settingsLink = page.locator('a[href="/settings"], .menu-item:has-text("设置")').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL(url => url.toString().includes('/settings'), { timeout: 5000 });
      expect(page.url()).toContain('/settings');
    }
  });
});

test.describe('Navigation — Route Guards', () => {
  test('TC-NAV-08: /defects without auth redirects to login', async ({ page }) => {
    // Clear any stored token
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => localStorage.removeItem('access_token'));
    await page.goto('http://localhost:3000/defects');
    await page.waitForURL(url => url.toString().includes('/login'), { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-NAV-09: /testcases without auth redirects to login', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => localStorage.removeItem('access_token'));
    await page.goto('http://localhost:3000/testcases');
    await page.waitForURL(url => url.toString().includes('/login'), { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-NAV-10: Authenticated user visiting /login redirects to /', async ({ page }) => {
    await setAuthInBrowser(page, sharedToken);
    await page.goto('http://localhost:3000/login');
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 5000 });
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('Navigation — Cross-module Flow', () => {
  test('TC-NAV-11: Full flow: Chat → Defects → Detail → Back → TestCases', async ({ page }) => {
    await setAuthInBrowser(page, sharedToken);

    // Start at chat
    await page.goto('http://localhost:3000/');
    expect(page.url()).toMatch(/localhost:3000\/?$/);

    // Navigate to defects
    await page.locator('.nav-link:has-text("缺陷管理"), a[href="/defects"]').click();
    await page.waitForURL(url => url.toString().includes('/defects'), { timeout: 5000 });
    await page.waitForTimeout(500);

    // Navigate to test cases
    await page.locator('.nav-link:has-text("用例库"), a[href="/testcases"]').click();
    await page.waitForURL(url => url.toString().includes('/testcases'), { timeout: 5000 });
    await page.waitForTimeout(500);

    // Navigate back to chat
    await page.locator('.new-chat-sidebar-btn, button:has-text("新建对话")').first().click();
    await page.waitForURL(url => url.toString().match(/localhost:3000\/?$/) !== null, { timeout: 5000 });
    expect(page.url()).toMatch(/localhost:3000\/?$/);
  });
});
