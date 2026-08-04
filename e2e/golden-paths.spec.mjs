// MyBuilderVault golden paths — Phase A surface.
// Runs against the LIVE deployed site (BASE_URL) as the e2e-robot 'admin'
// seat (staff golden paths; platform identity never derives from tenant
// roles). Data it creates is E2E- prefixed so the purge step keeps a
// clean floor.
import { test, expect } from '@playwright/test';

const BASE = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const EMAIL = process.env.E2E_AGENT_EMAIL ?? '';
const PASSWORD = process.env.E2E_AGENT_PASSWORD ?? '';

test.describe.configure({ mode: 'serial' });

async function login(page) {
  await page.goto(BASE + '/');
  await page.getByTestId('login-email').fill(EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('dashboard-title')).toBeVisible();
}

test('compliance pages serve full text without JavaScript', async ({ request }) => {
  for (const path of ['/privacy', '/terms', '/about']) {
    const r = await request.get(BASE + path);
    expect(r.ok(), `${path} should serve`).toBeTruthy();
    const body = await r.text();
    expect(body, `${path} should carry business identity`).toContain('Jaggars Software Holdings');
  }
});

test('builder login reaches the shell with the org visible', async ({ page }) => {
  await login(page);
  await expect(page.getByTestId('org-name')).toContainText('E2E Robot Builder');
  await expect(page.locator('text=build ')).toBeVisible(); // build stamp present
});

test('ticket queue renders stats from v_ticket_stats', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-tickets').click();
  await expect(page.getByTestId('tickets-title')).toBeVisible();
  await expect(page.getByTestId('stat-open')).toBeVisible();
});

test('concierge files a defect ticket that appears in the queue', async ({ page }) => {
  const subject = `E2E-defect ${Date.now()}`;
  await login(page);
  await page.getByTestId('concierge-bubble').click();
  await page.getByTestId('concierge-defect').click();
  await page.getByTestId('concierge-subject').fill(subject);
  await page.getByTestId('concierge-body').fill('Filed by the E2E robot. The purge step removes me.');
  await page.getByTestId('concierge-submit').click();
  await expect(page.getByTestId('concierge-done')).toBeVisible();
  await page.getByTestId('nav-tickets').click();
  await expect(page.getByTestId('tickets-title')).toBeVisible();
  await expect(page.locator(`text=${subject}`)).toBeVisible();
});
