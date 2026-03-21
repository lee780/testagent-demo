import { Page } from '@playwright/test';

export const TEST_USER = {
  username: 'e2euser01',
  password: 'E2EPass123',
  email: 'e2e01@test.com',
};

export const API_BASE = 'http://localhost:8000';
export const APP_BASE = 'http://localhost:3000';

/** Register + login via API, inject token into browser localStorage */
export async function loginViaAPI(page: Page, user = TEST_USER): Promise<string> {
  // Try register (ignore 409 if already exists)
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  }).catch(() => {});

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user.username, password: user.password }),
  });
  const loginData = await loginRes.json() as {
    access_token?: string;
    user?: unknown;
    data?: { access_token?: string; user?: unknown };
  };
  const token = loginData.access_token ?? loginData.data?.access_token ?? '';
  const userInfo = loginData.user ?? loginData.data?.user ?? { username: user.username };

  // Navigate to /login (always accessible, no redirect), then inject auth into localStorage
  await page.goto(`${APP_BASE}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user_info', JSON.stringify(u));
    },
    { t: token, u: userInfo }
  );

  return token;
}

/** Authenticated fetch helper (runs in Node.js context) */
export async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers ?? {}) as Record<string, string>),
    },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

/** Inject an already-fetched token into the browser's localStorage (no HTTP calls) */
export async function setAuthInBrowser(page: Page, token: string, username: string = TEST_USER.username): Promise<void> {
  await page.goto(`${APP_BASE}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user_info', JSON.stringify({ username: u }));
    },
    { t: token, u: username }
  );
}

/** Navigate to a page and wait until it's interactive */
export async function gotoAndWait(page: Page, path: string, readySelector?: string): Promise<void> {
  await page.goto(`${APP_BASE}${path}`);
  await page.waitForLoadState('networkidle');
  if (readySelector) {
    await page.waitForSelector(readySelector, { timeout: 10000 });
  } else {
    await page.waitForTimeout(500);
  }
}
