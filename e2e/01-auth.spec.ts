/**
 * E2E Test Suite 01 — Authentication
 * Covers: register, login, session persistence, logout, invalid credentials
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const UNIQUE = Date.now();
const USER = { username: `e2e_auth_${UNIQUE}`, password: 'E2EPass123!' };

test.describe('Auth — Register', () => {
  test('TC-AUTH-01: Register page renders', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.locator('input[type="text"], input[placeholder*="用户名"], input[name="username"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('TC-AUTH-02: Register with valid credentials succeeds', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    const usernameInput = page.locator('input').nth(0);
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill(USER.username);
    await passwordInput.fill(USER.password);
    // Fill confirm password if present
    const allPasswords = page.locator('input[type="password"]');
    if (await allPasswords.count() > 1) {
      await allPasswords.nth(1).fill(USER.password);
    }
    await page.locator('button[type="submit"], button:has-text("注册")').first().click();
    // Should redirect to login or home
    await page.waitForURL(url => !url.toString().includes('/register'), { timeout: 5000 });
  });

  test('TC-AUTH-03: Register with duplicate username shows error', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    const usernameInput = page.locator('input').nth(0);
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill(USER.username); // already exists
    await passwordInput.fill(USER.password);
    const allPasswords = page.locator('input[type="password"]');
    if (await allPasswords.count() > 1) {
      await allPasswords.nth(1).fill(USER.password);
    }
    await page.locator('button[type="submit"], button:has-text("注册")').first().click();
    // Should stay on register page or show error
    await page.waitForTimeout(1500);
    const stillOnRegister = page.url().includes('/register');
    const hasError = await page.locator('text=/已存在|已注册|冲突|失败|error/i').isVisible().catch(() => false);
    expect(stillOnRegister || hasError).toBeTruthy();
  });
});

test.describe('Auth — Login', () => {
  test('TC-AUTH-04: Login page renders', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('input').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('TC-AUTH-05: Login with valid credentials redirects to chat', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input').nth(0).fill(USER.username);
    await page.locator('input[type="password"]').first().fill(USER.password);
    await page.locator('button[type="submit"], button:has-text("登录")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 8000 });
    // Should be on chat page
    expect(page.url()).toMatch(/localhost:3000\/?$/);
  });

  test('TC-AUTH-06: Login with wrong password shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input').nth(0).fill(USER.username);
    await page.locator('input[type="password"]').first().fill('WrongPass999!');
    await page.locator('button[type="submit"], button:has-text("登录")').first().click();
    await page.waitForTimeout(2000);
    // Should stay on login
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-07: Unauthenticated access to / redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForURL(url => url.toString().includes('/login'), { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-08: Session persists after page reload', async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.locator('input').nth(0).fill(USER.username);
    await page.locator('input[type="password"]').first().fill(USER.password);
    await page.locator('button[type="submit"], button:has-text("登录")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 8000 });
    // Reload
    await page.reload();
    await page.waitForTimeout(1000);
    // Should still be authenticated (not redirected to login)
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('Auth — Logout', () => {
  test('TC-AUTH-09: Logout redirects to login page', async ({ page }) => {
    // Login first
    await page.goto(`${BASE}/login`);
    await page.locator('input').nth(0).fill(USER.username);
    await page.locator('input[type="password"]').first().fill(USER.password);
    await page.locator('button[type="submit"], button:has-text("登录")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 8000 });

    // Click user menu then logout
    await page.locator('.user-info, .user-avatar').first().click();
    await page.waitForTimeout(500);
    await page.locator('text=退出登录').first().click();
    await page.waitForURL(url => url.toString().includes('/login'), { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
