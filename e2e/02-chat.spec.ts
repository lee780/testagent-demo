/**
 * E2E Test Suite 02 — Chat Interface
 * Covers: new conversation, message input, mode buttons, file upload,
 *         send button, sidebar toggle, conversation history
 */
import { test, expect } from '@playwright/test';
import { loginViaAPI, setAuthInBrowser, gotoAndWait, TEST_USER, APP_BASE } from './helpers';

let sharedToken = '';

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  sharedToken = await loginViaAPI(page, TEST_USER);
  await page.close();
  await context.close();
});

test.describe('Chat — Core UI (empty state)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, sharedToken);
    await gotoAndWait(page, '/', '.send-btn');
  });

  test('TC-CHAT-01: Chat textarea is present in DOM', async ({ page }) => {
    // textarea exists either in empty-state or bottom input area
    const count = await page.locator('textarea').count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-CHAT-02: Mode buttons are rendered (4 test modes)', async ({ page }) => {
    const modeBtns = page.locator('.mode-btn');
    await expect(modeBtns.first()).toBeVisible({ timeout: 5000 });
    const count = await modeBtns.count();
    expect(count).toBe(4);
  });

  test('TC-CHAT-03: Mode button labels include 4 test modes', async ({ page }) => {
    // systematic / regression / exploratory / chaos — labels are emoji+Chinese
    const btns = await page.locator('.mode-btn').allInnerTexts();
    expect(btns.length).toBe(4);
  });

  test('TC-CHAT-04: Upload button is present', async ({ page }) => {
    await expect(page.locator('.upload-btn').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-CHAT-05: Send button is present', async ({ page }) => {
    await expect(page.locator('.send-btn').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-CHAT-06: Typing in textarea works', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill('这是一条端到端测试消息');
    const value = await textarea.inputValue();
    expect(value).toContain('端到端测试消息');
    // Clear after test
    await textarea.fill('');
  });

  test('TC-CHAT-07: Clicking mode button changes active state', async ({ page }) => {
    const modeBtns = page.locator('.mode-btn');
    // Click second mode button
    await modeBtns.nth(1).click();
    await page.waitForTimeout(300);
    const activeClass = await modeBtns.nth(1).getAttribute('class');
    expect(activeClass).toContain('active');
  });

  test('TC-CHAT-08: New conversation button is visible', async ({ page }) => {
    const newChatBtn = page.locator('.new-chat-sidebar-btn').first();
    await expect(newChatBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Chat — Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, sharedToken);
    await gotoAndWait(page, '/', '.sidebar-toggle');
  });

  test('TC-CHAT-09: Sidebar toggle collapses sidebar', async ({ page }) => {
    const toggleBtn = page.locator('.sidebar-toggle').first();
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();
    await page.waitForTimeout(500);
    const sidebar = page.locator('.sidebar').first();
    const classes = await sidebar.getAttribute('class');
    expect(classes).toContain('collapsed');
  });

  test('TC-CHAT-10: Sidebar toggle expands sidebar after collapse', async ({ page }) => {
    const toggleBtn = page.locator('.sidebar-toggle').first();
    // Collapse
    await toggleBtn.click();
    await page.waitForTimeout(400);
    // Expand
    await toggleBtn.click();
    await page.waitForTimeout(400);
    const sidebar = page.locator('.sidebar').first();
    const classes = await sidebar.getAttribute('class');
    expect(classes).not.toContain('collapsed');
  });

  test('TC-CHAT-11: Sidebar shows conversation history section', async ({ page }) => {
    // Either shows history items or "暂无对话历史"
    const historyEl = page.locator('.sidebar-history').first();
    await expect(historyEl).toBeVisible({ timeout: 5000 });
  });

  test('TC-CHAT-12: Sidebar shows nav links for 缺陷管理 and 用例库', async ({ page }) => {
    await expect(page.locator('.nav-link:has-text("缺陷管理")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.nav-link:has-text("用例库")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Chat — Preset Loading', () => {
  test('TC-CHAT-13: GET /api/chat/presets returns message and files', async ({ page }) => {
    // Test via API directly (reuse shared token)
    const res = await fetch('http://localhost:8000/api/chat/presets', {
      headers: { Authorization: `Bearer ${sharedToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { data: { message: string; files: Array<{ name: string }> } };
    expect(typeof data.data.message).toBe('string');
    expect(Array.isArray(data.data.files)).toBeTruthy();
    expect(data.data.files.length).toBe(2);
    const fileNames = data.data.files.map((f) => f.name);
    expect(fileNames).toContain('test_case_template.yaml');
    expect(fileNames).toContain('MODEL001_用例样例.yaml');
  });
});
