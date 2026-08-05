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
  await expect(page.getByTestId('build-stamp')).toContainText('build'); // stamp present with sha
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

test('mission control is invisible to a tenant seat', async ({ page }) => {
  // The e2e-robot is org admin but NOT platform staff. The nav must not
  // offer Mission Control, and forcing the route must bounce to dashboard.
  // (Platform identity never derives from tenant membership — 002 doctrine.)
  await login(page);
  await expect(page.getByTestId('nav-mission-control')).toHaveCount(0);
  await page.goto(BASE + '/mission-control');
  await expect(page.getByTestId('dashboard-title')).toBeVisible();
  await expect(page.getByTestId('mc-title')).toHaveCount(0);
});

test('job lifecycle: create, structure, status change', async ({ page }) => {
  const jobName = `E2E-job ${Date.now()}`;
  await login(page);
  await page.getByTestId('nav-jobs').click();
  await expect(page.getByTestId('jobs-title')).toBeVisible();
  await page.getByTestId('job-name').fill(jobName);
  await page.getByTestId('job-create').click();
  await expect(page.getByTestId('job-detail-title')).toContainText(jobName);
  await page.getByTestId('structure-label').fill('Main House');
  await page.getByTestId('structure-add').click();
  await expect(page.getByTestId('structure-row')).toContainText('Main House');
  await page.getByTestId('job-status').selectOption('design');
  await expect(page.getByTestId('job-status')).toHaveValue('design');
});

test('reports: run WIP summary, table renders', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-reports').click();
  await expect(page.getByTestId('reports-title')).toBeVisible();
  await page.getByTestId('report-pick').selectOption('wip_summary');
  await page.getByTestId('report-run').click();
  await expect(page.getByTestId('report-table')).toBeVisible();
});

test('field spine: work order lifecycle, checklist, time entry approval', async ({ page }) => {
  const woTitle = `E2E-wo ${Date.now()}`;
  await login(page);
  // A job must exist for the WO — create one (purge sweeps E2E- jobs + cascade).
  const jobName = `E2E-fieldjob ${Date.now()}`;
  await page.getByTestId('nav-jobs').click();
  await page.getByTestId('job-name').fill(jobName);
  await page.getByTestId('job-create').click();
  await expect(page.getByTestId('job-detail-title')).toContainText(jobName);
  // Create a WO on the board, discipline pool.
  await page.getByTestId('nav-field').click();
  await expect(page.getByTestId('field-title')).toBeVisible();
  await page.getByTestId('wo-title').fill(woTitle);
  await page.getByTestId('wo-job').selectOption({ label: jobName });
  await page.getByTestId('wo-create').click();
  const row = page.getByTestId('wo-row').filter({ hasText: woTitle });
  await expect(row).toBeVisible();
  // Advance draft → issued, then open the drawer and work the checklist.
  await row.getByTestId('wo-advance').selectOption('issued');
  await expect(row).toContainText('issued');
  await row.click();
  await expect(page.getByTestId('wo-drawer-title')).toContainText(woTitle);
  await page.getByTestId('woi-label').fill('Set forms');
  await page.getByTestId('woi-add').click();
  const item = page.getByTestId('woi-row').filter({ hasText: 'Set forms' });
  await expect(item).toBeVisible();
  await item.getByTestId('woi-check').check();
  await page.getByTestId('wo-drawer-close').click();
  // Time: log an entry, then approve it from the queue (robot is org admin).
  await page.getByTestId('field-tab-time').click();
  await page.getByTestId('te-job').selectOption({ label: jobName });
  await page.getByTestId('te-hours').fill('3.5');
  await page.getByTestId('te-add').click();
  const qrow = page.getByTestId('te-queue-row').filter({ hasText: jobName });
  await expect(qrow).toBeVisible();
  await qrow.getByTestId('te-approve').click();
  await expect(page.getByTestId('te-mine-row').filter({ hasText: jobName })).toContainText('approved');
});
