import { test, expect, type Page } from '@playwright/test';

/**
 * Every API answers `503 database_not_configured` in demo mode by design (that's exactly what triggers
 * the sample-data fallback) — Chrome logs any non-2xx response as a console "error" regardless of
 * whether the app handled it correctly. This project has already run into this noise by hand ("only the
 * expected 503 in the console", M1 Task 7's progress log) — filter it out here, keep everything else.
 */
function collectUnexpectedErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (/status of 503/.test(msg.text())) return;
    errors.push(msg.text());
  });
  return errors;
}

/**
 * Runs against a server with every database/Supabase env var explicitly blanked (see
 * playwright.config.ts) — no `DATABASE_URL`, exactly what a fresh clone looks like before anyone sets
 * up Supabase. Every screen must fall back to sample data with an honest notice, never crash, never log
 * an error. This automates, for the first time, a check this project has so far only ever done by hand
 * each session.
 */
test.describe('demo mode (no database configured)', () => {
  test('Emergency Hub renders sample requests with the demo notice, no console errors', async ({ page }) => {
    const errors = collectUnexpectedErrors(page);

    await page.goto('/en');
    await expect(page.getByText('Sample data: no database is connected', { exact: false })).toBeVisible();
    // At least one sample request card renders (the demand headline text from mockData.ts).
    await expect(page.getByText('Looking for donors', { exact: false }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Donor Directory renders sample donors with the sample notice, no console errors', async ({ page }) => {
    const errors = collectUnexpectedErrors(page);

    await page.goto('/en/donors');
    await expect(page.getByText('No database is connected, so this list shows sample donors', { exact: false })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('the admin area stays closed without NEXT_PUBLIC_ADMIN_OPEN', async ({ page }) => {
    const response = await page.goto('/en/admin');
    // The proxy redirects to /no-access/admin rather than serving the panel.
    expect(page.url()).toContain('/no-access/admin');
    expect(response?.ok()).toBeTruthy();
  });
});
