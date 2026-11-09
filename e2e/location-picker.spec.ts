import { test, expect } from '@playwright/test';
import { getPrisma } from '../src/lib/prisma.ts';
import { ACCOUNTS, ORG, createAccounts, removeAccounts, signIn } from './tutorial/accounts.ts';

/**
 * The map location picker on the "register your organization" form: search a place, use the current location,
 * click the map, edit the numbers, and the saved application carries the latitude and longitude.
 * Needs a real (local) database; skips itself without one. Leaves its pending application row in place.
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: the skip below handles it
}

const RUN = Date.now().toString().slice(-7);

test('apply form: pick a location four ways, then the application is saved with it', async ({ page, context, request }) => {
  const probe = await request.get('/api/organizations');
  test.skip(probe.status() === 503, 'no real database configured for this run');

  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 23.8103, longitude: 90.4125 });

  await page.goto('/en/hospitals');
  await page.locator('summary', { hasText: /register/i }).first().click();
  const picker = page.getByTestId('location-picker');
  await expect(picker).toBeVisible({ timeout: 30_000 });
  const lat = picker.getByLabel('Latitude');
  const lng = picker.getByLabel('Longitude');
  await expect(lat).toHaveValue('');

  // 1. Use my current location.
  await picker.getByRole('button', { name: 'Use my current location' }).click();
  await expect(lat).toHaveValue('23.8103');
  await expect(lng).toHaveValue('90.4125');

  // 2. Click on the map: the numbers change and the pin moves.
  const map = picker.locator('.leaflet-container');
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await expect(lat).not.toHaveValue('23.8103');
  const clickedLat = Number(await lat.inputValue());
  expect(clickedLat).toBeGreaterThan(20);
  expect(clickedLat).toBeLessThan(27);
  await expect(picker.locator('.leaflet-marker-icon')).toHaveCount(1);

  // 3. Search a place (needs the internet): either a result list or the polite "not available" message.
  await picker.getByLabel('Search a place, e.g. Dhaka Medical College').fill('Dhaka Medical College');
  await picker.getByRole('button', { name: 'Search', exact: true }).click();
  const firstResult = picker.locator('ul li button').first();
  const failed = picker.getByRole('status');
  await expect(firstResult.or(failed)).toBeVisible({ timeout: 20_000 });
  if (await firstResult.isVisible()) {
    await firstResult.click();
    await expect(lat).not.toHaveValue(String(clickedLat));
    expect(Number(await lat.inputValue())).toBeGreaterThan(23.6);
    expect(Number(await lat.inputValue())).toBeLessThan(23.9);
  }

  // 4. Type the numbers by hand: always works.
  await lat.fill('23.7461');
  await lng.fill('90.3742');
  await expect(lat).toHaveValue('23.7461');

  const name = `E2E Map Clinic ${RUN}`;
  const form = page.locator('form', { has: page.getByTestId('location-picker') });
  await form.locator('input[type=text]').nth(0).fill(name);
  await form.locator('input[type=text]').nth(1).fill('Dhanmondi Road 27, Dhaka');
  await form.locator('input[type=text]').nth(2).fill(`LIC-${RUN}`);
  await form.getByRole('button', { name: /submit|apply/i }).last().click();

  await expect.poll(async () => (await getPrisma().organization.findFirst({ where: { name } }))?.latitude, { timeout: 20_000 }).toBeCloseTo(23.7461, 4);
  const saved = await getPrisma().organization.findFirst({ where: { name } });
  expect(saved?.longitude).toBeCloseTo(90.3742, 4);
  expect(saved?.status).toBe('pending');
});

test('admin edit: the Hospitals tab edit window carries the same picker and saves the location', async ({ page, request }) => {
  const probe = await request.get('/api/organizations');
  test.skip(probe.status() === 503, 'no real database configured for this run');
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'needs the real Supabase project for an admin login');

  await createAccounts();
  try {
    await signIn(page, 'admin', 'en');
    await page.goto('/en/admin');
    await page.getByText('Hospitals & Blood Banks', { exact: true }).first().click();
    const card = page.locator('div.rounded-2xl', { hasText: ORG.name }).filter({ has: page.getByRole('button', { name: 'Edit' }) }).last();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole('button', { name: 'Edit' }).click();

    const dialog = page.getByRole('dialog');
    const picker = dialog.getByTestId('location-picker');
    await expect(picker).toBeVisible();
    await picker.getByLabel('Latitude').fill('23.7258');
    await picker.getByLabel('Longitude').fill('90.3976');
    await expect(picker.locator('.leaflet-marker-icon')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect.poll(async () => (await getPrisma().organization.findUnique({ where: { id: ORG.id } }))?.latitude, { timeout: 20_000 }).toBeCloseTo(23.7258, 4);
    expect((await getPrisma().organization.findUnique({ where: { id: ORG.id } }))?.longitude).toBeCloseTo(90.3976, 4);
  } finally {
    await removeAccounts();
    void ACCOUNTS;
  }
});
