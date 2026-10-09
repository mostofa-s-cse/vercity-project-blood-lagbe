import { test, expect } from '@playwright/test';

/**
 * Needs a real database (`.dev-db` locally, a GitHub Actions Postgres service container in CI — see
 * playwright.config.ts and Task 6). Skips itself gracefully, rather than failing confusingly, when none
 * is configured.
 *
 * The core "emergencies must never need an account" flow: a signed-out visitor posts an SOS, it appears
 * on the Emergency Hub for every other signed-out visitor, a second signed-out visitor answers "I can
 * donate", and the status flips from "Looking for donors" to "Donor found" — all without either person
 * ever signing in.
 *
 * Leaves its test row in the database on a local `.dev-db` run (same as this project's other manual
 * verification scripts this session) — harmless there, and moot in CI, where Task 6's Postgres service
 * container is thrown away after the job.
 */
test.describe('SOS lifecycle (signed out, real database)', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get('/api/donors');
    test.skip(response.status() === 503, 'no real database configured for this run — see playwright.config.ts');
  });

  test('a visitor posts an SOS, a second visitor responds, the status flips to Donor Found', async ({ page, browser }) => {
    const unique = Date.now().toString().slice(-6);
    const place = `E2E Test Hospital ${unique}`;
    // A valid Bangladesh mobile number is exactly 11 digits: 01[3-9] + 8 more digits.
    const eightDigits = Date.now().toString().slice(-8).padStart(8, '0');
    const posterPhone = `017${eightDigits}`;

    // Visitor 1: post the SOS.
    await page.goto('/en/sos');
    await page.getByRole('button', { name: 'O+', exact: true }).click();
    await page.getByLabel('Donation place').fill(place);
    await page.getByLabel('Contact number').fill(posterPhone);
    await page.getByRole('button', { name: 'Post SOS' }).click();

    // A success screen renders — then go to the Emergency Hub as this same visitor would.
    await expect(page.getByText(place)).toBeVisible({ timeout: 10_000 });
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: place, exact: true })).toBeVisible();

    // Visitor 2: a separate browser context (no shared cookies/localStorage with visitor 1).
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await secondPage.goto('/en');

    const heading = secondPage.getByRole('heading', { name: place, exact: true });
    await expect(heading).toBeVisible();
    const card = heading.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(card.getByText('Looking for donors')).toBeVisible();

    await card.getByRole('button', { name: 'I Can Donate' }).click();
    await secondPage.getByLabel('Your name').fill('E2E Donor');
    await secondPage.getByLabel('Your phone number').fill(`019${eightDigits}`);
    await secondPage.getByRole('button', { name: 'Send' }).click();

    await expect(secondPage.getByText('Your answer was sent to the family.')).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText('Donor found')).toBeVisible();

    await secondContext.close();
  });
});
