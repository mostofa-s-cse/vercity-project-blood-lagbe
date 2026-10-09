import { test, expect } from '@playwright/test';

/**
 * Needs a real database (see sos-lifecycle.spec.ts's comment and playwright.config.ts); skips itself
 * gracefully when none is configured.
 *
 * A donor registers without an account (a manage token is remembered in this browser's localStorage,
 * WP3), reloads the page, and sees their real profile instead of a blank form; editing availability and
 * saving persists on the server, not just in local component state — confirmed by reloading again.
 */
test.describe('donor profile (signed out, real database)', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get('/api/donors');
    test.skip(response.status() === 503, 'no real database configured for this run — see playwright.config.ts');
  });

  test('registering remembers the donor; toggling availability persists across a reload', async ({ page }) => {
    const unique = Date.now().toString().slice(-6);
    const name = `E2E Donor ${unique}`;
    const eightDigits = Date.now().toString().slice(-8).padStart(8, '0');
    const phone = `018${eightDigits}`;
    const area = `E2E Area ${unique}`;

    await page.goto('/en/register');
    await page.getByLabel('Full name').fill(name);
    await page.getByLabel('Mobile number').fill(phone);
    await page.getByLabel('Area').fill(area);
    await page.getByRole('button', { name: 'A+', exact: true }).click();
    await page.getByRole('checkbox', { name: /I am healthy/ }).check();
    await page.getByRole('button', { name: 'Register as donor', exact: true }).click();

    await expect(page.getByText('You are now a registered donor')).toBeVisible({ timeout: 10_000 });

    // Reload: this browser's remembered donor id should now show the real "My profile" panel.
    await page.goto('/en/register');
    await expect(page.getByText('My donor profile')).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    const availableSwitch = page.getByRole('switch', { name: 'Available to donate now' });
    await expect(availableSwitch).toHaveAttribute('aria-checked', 'true');
    await availableSwitch.click();
    await expect(availableSwitch).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 10_000 });

    // Reload again: the real server-side value, not just local component state, should still say "off".
    await page.goto('/en/register');
    await expect(page.getByRole('switch', { name: 'Available to donate now' })).toHaveAttribute('aria-checked', 'false');
  });
});
