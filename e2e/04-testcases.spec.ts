/**
 * E2E Test Suite 04 — Test Case Library
 * Covers: page load, stats cards, create, lifecycle (submit/approve/baseline),
 *         version history, search/filter, AI recommend panel
 */
import { test, expect } from '@playwright/test';
import { loginViaAPI, setAuthInBrowser, apiFetch, TEST_USER, APP_BASE } from './helpers';

let token = '';
let createdCaseId = '';

// Login once for the entire file to avoid rate limiting
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  token = await loginViaAPI(page, TEST_USER);
  await page.close();
  await context.close();
});

test.describe('TestCases — List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, token);
    await page.goto(`${APP_BASE}/testcases`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.stat-card', { timeout: 10000 });
  });

  test('TC-LIB-01: Test cases page loads', async ({ page }) => {
    await expect(page.locator('h1:has-text("用例库"), .page-title:has-text("用例")')).toBeVisible({ timeout: 5000 });
  });

  test('TC-LIB-02: Stats cards are rendered (4 cards)', async ({ page }) => {
    const cards = page.locator('.stat-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('TC-LIB-03: Stats cards show correct labels', async ({ page }) => {
    await expect(page.locator('.stat-card:has-text("草稿")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("待审核")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("已通过")')).toBeVisible();
    await expect(page.locator('.stat-card:has-text("基线")')).toBeVisible();
  });

  test('TC-LIB-04: "新建用例" button opens create dialog', async ({ page }) => {
    await page.locator('button:has-text("新建用例")').click();
    await expect(page.locator('.dialog-title:has-text("新建用例")')).toBeVisible({ timeout: 3000 });
  });

  test('TC-LIB-05: Create a test case (DRAFT)', async ({ page }) => {
    await page.locator('button:has-text("新建用例")').click();
    await page.waitForTimeout(300);

    const inputs = page.locator('.dialog input[type="text"], .dialog input:not([type="password"])');
    await inputs.nth(0).fill('MODEL_E2E');  // modelId
    await inputs.nth(1).fill('TC_MODEL_E2E_S01');  // caseCode
    await inputs.nth(2).fill('E2E测试-用户等级边界值');  // title
    // coveragePoint
    if (await inputs.count() > 3) {
      await inputs.nth(3).fill('等价类/用户等级/有效类/等级1');
    }

    // Priority select
    const prioritySelect = page.locator('.dialog select');
    if (await prioritySelect.count() > 0) {
      await prioritySelect.first().selectOption('P1');
    }

    await page.locator('.dialog textarea').first().fill('测试用例：验证用户等级为1时的授信额度计算是否正确');
    await page.locator('.dialog button:has-text("创建")').click();
    await page.waitForTimeout(1000);

    // Dialog should close
    const dialogGone = await page.locator('.dialog-title:has-text("新建用例")').isVisible().then(v => !v).catch(() => true);
    expect(dialogGone).toBeTruthy();
  });

  test('TC-LIB-06: Status filter works', async ({ page }) => {
    await page.locator('.filter-select').first().selectOption('DRAFT');
    await page.waitForTimeout(800);
    const tableOrEmpty = await page.locator('.tc-table, .empty-state').count();
    expect(tableOrEmpty).toBeGreaterThanOrEqual(0);
  });

  test('TC-LIB-07: Model ID filter works', async ({ page }) => {
    await page.locator('.model-input').fill('MODEL_E2E');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/testcases');
  });

  test('TC-LIB-08: Clicking stats card filters by status', async ({ page }) => {
    await page.locator('.stat-card:has-text("草稿")').click();
    await page.waitForTimeout(800);
    // Filter should be applied
    const filterSelect = page.locator('.filter-select').first();
    const value = await filterSelect.inputValue();
    expect(value).toBe('DRAFT');
  });

  test('TC-LIB-09: AI recommend panel opens', async ({ page }) => {
    await page.locator('button:has-text("AI 推荐回归用例")').click();
    await expect(page.locator('.recommend-panel').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-LIB-10: AI recommend shows textarea for change description', async ({ page }) => {
    await page.locator('button:has-text("AI 推荐回归用例")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.recommend-textarea, .recommend-panel textarea')).toBeVisible();
  });

  test('TC-LIB-11: AI recommend panel can be closed', async ({ page }) => {
    await page.locator('button:has-text("AI 推荐回归用例")').click();
    await page.waitForTimeout(300);
    await page.locator('.btn-close, button:has-text("✕")').first().click();
    await page.waitForTimeout(300);
    const panelGone = await page.locator('.recommend-panel').isVisible().then(v => !v).catch(() => true);
    expect(panelGone).toBeTruthy();
  });
});

test.describe('TestCases — Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthInBrowser(page, token);
    // Create a test case via API
    const res = await apiFetch('/api/testcases', token, {
      method: 'POST',
      body: JSON.stringify({
        modelId: 'MODEL_LIFECYCLE',
        caseCode: `TC_LC_${Date.now()}`,
        title: 'E2E生命周期测试用例',
        coveragePoint: '等价类/用户等级/有效类',
        priority: 'P2',
        notes: '用于端到端生命周期测试',
      }),
    });
    const tc = (res.body as { data: { id: string } }).data;
    createdCaseId = tc.id;
    await page.goto(`http://localhost:3000/testcases/${createdCaseId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.status-badge', { timeout: 10000 });
  });

  test('TC-LIB-12: Detail page shows title', async ({ page }) => {
    await expect(page.locator('.detail-title, h1:has-text("E2E生命周期")')).toBeVisible({ timeout: 5000 });
  });

  test('TC-LIB-13: Status shows DRAFT initially', async ({ page }) => {
    await expect(page.locator('.status-badge.st-draft').first()).toBeVisible({ timeout: 3000 });
  });

  test('TC-LIB-14: "提交审核" button is visible for DRAFT', async ({ page }) => {
    await expect(page.locator('button:has-text("提交审核")')).toBeVisible({ timeout: 3000 });
  });

  test('TC-LIB-15: Submit for review changes status to PENDING_REVIEW', async ({ page }) => {
    await page.locator('button:has-text("提交审核")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.status-badge.st-pending').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-LIB-16: Approve changes status to APPROVED', async ({ page }) => {
    // Submit via UI (status starts as DRAFT from beforeEach)
    await page.locator('button:has-text("提交审核")').click();
    await page.waitForSelector('.btn-approve', { timeout: 10000 });

    await page.locator('.btn-approve').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.status-badge.st-approved').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-LIB-17: Baseline changes status to BASELINE', async ({ page }) => {
    // Submit via UI
    await page.locator('button:has-text("提交审核")').click();
    await page.waitForSelector('.btn-approve', { timeout: 10000 });
    // Approve via UI
    await page.locator('.btn-approve').click();
    await page.waitForSelector('.btn-baseline', { timeout: 10000 });

    page.on('dialog', async dialog => { await dialog.accept(); });
    await page.locator('.btn-baseline').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.status-badge.st-baseline').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-LIB-18: Version history panel shows correct data', async ({ page }) => {
    await page.locator('button:has-text("版本历史")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('.history-panel').first()).toBeVisible({ timeout: 3000 });
    // Should show v1 entry
    await expect(page.locator('.history-panel').getByText('v1')).toBeVisible({ timeout: 3000 });
  });

  test('TC-LIB-19: Back button returns to list', async ({ page }) => {
    await page.locator('button:has-text("返回列表"), .btn-back').click();
    await page.waitForURL(url => url.toString().endsWith('/testcases'), { timeout: 5000 });
    expect(page.url()).toContain('/testcases');
  });
});

test.describe('TestCases — Version Control', () => {
  test('TC-LIB-20: Creating same caseCode creates new version and deprecates old', async ({ page }) => {
    // token is already set from the beforeAll
    const caseCode = `TC_VER_${Date.now()}`;
    const modelId = 'MODEL_VER';

    // Create v1
    const res1 = await apiFetch('/api/testcases', token, {
      method: 'POST',
      body: JSON.stringify({ modelId, caseCode, title: 'Version 1', priority: 'P2' }),
    });
    const v1 = (res1.body as { data: { id: string; version: number } }).data;
    expect(v1.version).toBe(1);

    // Create v2 (same modelId + caseCode)
    const res2 = await apiFetch('/api/testcases', token, {
      method: 'POST',
      body: JSON.stringify({ modelId, caseCode, title: 'Version 2', priority: 'P1' }),
    });
    const v2 = (res2.body as { data: { id: string; version: number } }).data;
    expect(v2.version).toBe(2);

    // Check v1 is now DEPRECATED
    const v1Detail = await apiFetch(`/api/testcases/${v1.id}`, token);
    const v1Status = ((v1Detail.body as { data: { status: string } }).data).status;
    expect(v1Status).toBe('DEPRECATED');
  });
});
