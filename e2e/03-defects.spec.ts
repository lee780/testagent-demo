/**
 * E2E Test Suite 03 — Defect Management
 * Covers: list page, create, filter, detail, status update, comment, knowledge tab
 */
import { test, expect } from '@playwright/test';
import { loginViaAPI, setAuthInBrowser, apiFetch, gotoAndWait, TEST_USER, APP_BASE } from './helpers';

let token = '';

// Login once for the entire file to avoid rate limiting
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  token = await loginViaAPI(page, TEST_USER);
  await page.close();
  await context.close();
});

test.describe('Defects — List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, token);
    await gotoAndWait(page, '/defects', '.tab-bar');
  });

  test('TC-DEF-01: Defects page renders with title', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1.page-title')).toHaveText('缺陷管理');
  });

  test('TC-DEF-02: Filter bar and search input are visible', async ({ page }) => {
    await expect(page.locator('.filter-bar')).toBeVisible();
    await expect(page.locator('.search-input').first()).toBeVisible();
  });

  test('TC-DEF-03: Tab bar shows 缺陷列表 and 缺陷知识库', async ({ page }) => {
    await expect(page.locator('.tab-btn:has-text("缺陷列表")')).toBeVisible();
    await expect(page.locator('.tab-btn:has-text("缺陷知识库")')).toBeVisible();
  });

  test('TC-DEF-04: "新建缺陷" button opens dialog', async ({ page }) => {
    await page.locator('button:has-text("新建缺陷")').click();
    await expect(page.locator('.dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.dialog-title')).toHaveText('新建缺陷');
  });

  test('TC-DEF-05: Create defect with full fields succeeds', async ({ page }) => {
    await page.locator('button:has-text("新建缺陷")').click();
    await page.waitForSelector('.dialog', { timeout: 3000 });

    await page.locator('.dialog input').first().fill('E2E缺陷-精度问题-' + Date.now());
    await page.locator('.dialog select').first().selectOption('P1');
    await page.locator('.dialog textarea').first().fill('月均余额精度问题导致授信额度偏差');

    await page.locator('.dialog .btn-primary').click();
    await page.waitForTimeout(1000);

    // Dialog should close
    const dialogVisible = await page.locator('.dialog').isVisible().catch(() => false);
    expect(dialogVisible).toBe(false);
  });

  test('TC-DEF-06: Create defect with empty title is blocked by HTML validation', async ({ page }) => {
    await page.locator('button:has-text("新建缺陷")').click();
    await page.waitForSelector('.dialog', { timeout: 3000 });
    // Fill description but not title
    await page.locator('.dialog textarea').first().fill('Description without title');
    await page.locator('.dialog .btn-primary').click();
    await page.waitForTimeout(500);
    // Dialog still open (required field prevents submit)
    await expect(page.locator('.dialog')).toBeVisible();
  });

  test('TC-DEF-07: Status filter dropdown has correct options', async ({ page }) => {
    const select = page.locator('.filter-select').first();
    const options = await select.locator('option').allInnerTexts();
    expect(options).toContain('全部状态');
    expect(options.some(o => o.includes('OPEN'))).toBeTruthy();
    expect(options.some(o => o.includes('处理中'))).toBeTruthy();
  });

  test('TC-DEF-08: Severity filter dropdown has correct options', async ({ page }) => {
    const selects = page.locator('.filter-select');
    const sevSelect = selects.nth(1);
    const options = await sevSelect.locator('option').allInnerTexts();
    expect(options.some(o => o.includes('P0'))).toBeTruthy();
    expect(options.some(o => o.includes('P2'))).toBeTruthy();
  });

  test('TC-DEF-09: Switching to 知识库 tab changes content', async ({ page }) => {
    await page.locator('.tab-btn:has-text("缺陷知识库")').click();
    await page.waitForTimeout(600);
    // Should show knowledge content area (may be empty)
    const knowledgeArea = await page.locator('.knowledge-grid, .empty-state').count();
    expect(knowledgeArea).toBeGreaterThan(0);
  });

  test('TC-DEF-10: Switching back to 缺陷列表 tab restores list', async ({ page }) => {
    await page.locator('.tab-btn:has-text("缺陷知识库")').click();
    await page.waitForTimeout(300);
    await page.locator('.tab-btn:has-text("缺陷列表")').click();
    await page.waitForTimeout(300);
    // Table or empty state should be visible
    const listContent = await page.locator('.defects-table, .empty-state').count();
    expect(listContent).toBeGreaterThan(0);
  });
});

test.describe('Defects — Detail Page', () => {
  let defectId = '';

  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, token);
    // Create defect via API
    const res = await apiFetch('/api/defects', token, {
      method: 'POST',
      body: JSON.stringify({
        title: 'E2E详情测试缺陷-' + Date.now(),
        description: '端到端详情页测试缺陷',
        severity: 'P2',
        reproSteps: '1. 输入边界值\n2. 检查计算结果',
        expectedResult: '返回正确授信额度',
        actualResult: '返回值偏低0.01元',
      }),
    });
    defectId = ((res.body as { data: { id: string } }).data).id;
    await gotoAndWait(page, `/defects/${defectId}`, '.defect-title');
  });

  test('TC-DEF-11: Detail page shows defect title', async ({ page }) => {
    await expect(page.locator('.defect-title')).toBeVisible({ timeout: 5000 });
  });

  test('TC-DEF-12: Severity and status badges are visible', async ({ page }) => {
    await expect(page.locator('.severity-badge').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.status-badge').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-DEF-13: 预期结果 and 实际结果 comparison section shows', async ({ page }) => {
    await expect(page.locator('.compare-grid')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.compare-pass')).toBeVisible();
    await expect(page.locator('.compare-fail')).toBeVisible();
  });

  test('TC-DEF-14: 更新状态 button opens status dialog', async ({ page }) => {
    await page.locator('button:has-text("更新状态")').click();
    await expect(page.locator('.dialog-small')).toBeVisible({ timeout: 3000 });
  });

  test('TC-DEF-15: Status can be changed to IN_PROGRESS', async ({ page }) => {
    await page.locator('button:has-text("更新状态")').click();
    await page.waitForSelector('.dialog-small', { timeout: 3000 });
    await page.locator('.dialog-small select').first().selectOption('IN_PROGRESS');
    await page.locator('.dialog-small .btn-primary').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=处理中').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-DEF-16: Comment textarea is visible', async ({ page }) => {
    await expect(page.locator('.comment-textarea')).toBeVisible({ timeout: 3000 });
  });

  test('TC-DEF-17: Comment can be submitted', async ({ page }) => {
    await page.locator('.comment-textarea').fill('E2E测试评论-' + Date.now());
    await page.locator('button:has-text("发表")').click();
    await page.waitForTimeout(1000);
    // Comment list should grow
    await expect(page.locator('.comment-item').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-DEF-18: AI analysis button is visible', async ({ page }) => {
    await expect(page.locator('.btn-ai')).toBeVisible({ timeout: 3000 });
  });

  test('TC-DEF-19: Back button returns to defects list', async ({ page }) => {
    await page.locator('.btn-back').click();
    await page.waitForURL(url => url.toString().endsWith('/defects'), { timeout: 5000 });
    expect(page.url()).toContain('/defects');
  });
});
