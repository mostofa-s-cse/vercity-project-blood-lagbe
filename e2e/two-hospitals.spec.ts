import { test, expect, type Browser, type Page } from '@playwright/test';
import { getPrisma } from '../src/lib/prisma.ts';

/**
 * Two organization accounts (a hospital and a blood bank), each signed in in its own browser, each
 * changing only its own stock. Needs the real database AND the real Supabase project from `.env.local`:
 * it creates two confirmed test users through Supabase's admin API (with the same `app_metadata` the
 * Hospital staff role writes: `permissions` + `hospital_id`), two approved organizations, and removes
 * all of it afterwards. Skips itself when either is missing.
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: the skip below handles it
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const RUN = Date.now().toString().slice(-7);
const PASSWORD = `E2e-${RUN}-Pass!`;

const ORGS = {
  hospital: { id: `e2e-hosp-${RUN}`, name: `E2E City Hospital ${RUN}`, type: 'private_hospital', email: `e2e.hospital.${RUN}@mailinator.com` },
  bank: { id: `e2e-bank-${RUN}`, name: `E2E Blood Bank ${RUN}`, type: 'blood_bank', email: `e2e.bank.${RUN}@mailinator.com` },
};
const userIds: string[] = [];

async function adminFetch(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...init.headers },
  });
}

async function signedInPage(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/en/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 20_000 });
  return page;
}

async function openHospital(page: Page, name: string) {
  await page.goto('/en/hospitals');
  const picker = page.locator('select').filter({ has: page.locator('option', { hasText: name }) });
  await expect(picker).toBeVisible({ timeout: 20_000 });
  await picker.selectOption(await picker.locator('option', { hasText: name }).getAttribute('value'));
}

const card = (page: Page, group: string) =>
  page.locator('div.p-4.rounded-2xl.border', { has: page.locator('span.text-2xl', { hasText: new RegExp(`^${group.replace('+', '\\+')}$`) }) });
const count = (page: Page, group: string) => card(page, group).locator('div.text-xl');

test.describe.serial('hospital and blood bank accounts (real database + Supabase)', () => {
  test.beforeAll(async ({ request }) => {
    test.skip(!SUPABASE_URL || !SERVICE_KEY, 'no Supabase project configured');
    const probe = await request.get('/api/organizations');
    test.skip(probe.status() === 503, 'no real database configured for this run');

    const prisma = getPrisma();
    for (const org of Object.values(ORGS)) {
      await prisma.organization.create({
        data: { id: org.id, name: org.name, type: org.type, status: 'approved', isVerified: true, address: 'E2E Road, Dhaka', licenseNumber: `E2E-${RUN}`, division: 'Dhaka' },
      });
      const response = await adminFetch('users', {
        method: 'POST',
        body: JSON.stringify({
          email: org.email,
          password: PASSWORD,
          email_confirm: true,
          app_metadata: { role: 'hospital', role_name: 'Hospital staff', permissions: ['stock.own', 'camps.create'], hospital_id: org.id },
        }),
      });
      expect(response.status, await response.clone().text()).toBeLessThan(300);
      userIds.push(((await response.json()) as { id: string }).id);
    }
  });

  test.afterAll(async () => {
    for (const id of userIds) await adminFetch(`users/${id}`, { method: 'DELETE' }).catch(() => undefined);
    if (!process.env.DATABASE_URL) return;
    const prisma = getPrisma();
    const ids = Object.values(ORGS).map((org) => org.id);
    await prisma.stockBatch.deleteMany({ where: { hospitalId: { in: ids } } });
    await prisma.hospitalStock.deleteMany({ where: { hospitalId: { in: ids } } });
    await prisma.requisition.deleteMany({ where: { hospitalId: { in: ids } } });
    await prisma.camp.deleteMany({ where: { hospitalId: { in: ids } } });
    await prisma.organization.deleteMany({ where: { id: { in: ids } } });
  });

  test('each account changes only its own stock', async ({ browser }) => {
    const hospital = await signedInPage(browser, ORGS.hospital.email);
    const bank = await signedInPage(browser, ORGS.bank.email);

    // Hospital: +1 twice on O+, and it survives a reload.
    await openHospital(hospital, ORGS.hospital.name);
    await expect(count(hospital, 'O+')).toHaveText(/^0\s/);
    await card(hospital, 'O+').getByRole('button', { name: '+1' }).click();
    await card(hospital, 'O+').getByRole('button', { name: '+1' }).click();
    await expect(count(hospital, 'O+')).toHaveText(/^2\s/);
    await expect.poll(async () => (await hospital.request.get('/api/hospitals/stock')).json().then((d) => d.stock?.[ORGS.hospital.id]?.['O+'])).toBe(2);
    await openHospital(hospital, ORGS.hospital.name);
    await expect(count(hospital, 'O+')).toHaveText(/^2\s/);

    // Blood bank: +1 three times on A+, set an exact number, then remove the group.
    await openHospital(bank, ORGS.bank.name);
    for (let i = 0; i < 3; i++) await card(bank, 'A+').getByRole('button', { name: '+1' }).click();
    await expect(count(bank, 'A+')).toHaveText(/^3\s/);
    await card(bank, 'A+').getByLabel('Set exact count').fill('10');
    await card(bank, 'A+').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(count(bank, 'A+')).toHaveText(/^10\s/);
    await expect.poll(async () => (await bank.request.get('/api/hospitals/stock')).json().then((d) => d.stock?.[ORGS.bank.id]?.['A+'])).toBe(10);
    await card(bank, 'A+').getByRole('button', { name: 'Remove this group from stock' }).click();
    await expect(count(bank, 'A+')).toHaveText(/^0\s/);
    await expect.poll(async () => (await bank.request.get('/api/hospitals/stock')).json().then((d) => d.stock?.[ORGS.bank.id]?.['A+'])).toBeUndefined();

    // Neither account may touch the other's stock (server answers 403, whatever the screen shows).
    const put = (page: Page, id: string) =>
      page.request.put(`/api/hospitals/${id}/stock`, { data: { bloodGroup: 'O+', units: 999 } });
    expect((await put(hospital, ORGS.bank.id)).status()).toBe(403);
    expect((await put(bank, ORGS.hospital.id)).status()).toBe(403);
    const del = await bank.request.delete(`/api/hospitals/${ORGS.hospital.id}/stock?bloodGroup=O%2B`);
    expect(del.status()).toBe(403);

    // The hospital's stock is exactly what it was.
    await openHospital(hospital, ORGS.hospital.name);
    await expect(count(hospital, 'O+')).toHaveText(/^2\s/);
  });

  test('blood bank receives a batch with expiry, then discards it', async ({ browser }) => {
    const bank = await signedInPage(browser, ORGS.bank.email);
    await openHospital(bank, ORGS.bank.name);

    const panel = bank.locator('div.rounded-3xl', { has: bank.getByRole('heading', { name: 'Receive blood and track expiry' }) });
    await panel.locator('select').selectOption('O-');
    await panel.locator('input[type=number]').fill('5');
    const expiry = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await panel.locator('input[type=date]').fill(expiry);
    await panel.getByRole('button', { name: 'Receive bags' }).click();

    await expect(panel.getByText(`Expires ${expiry}`)).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => (await bank.request.get('/api/hospitals/stock')).json().then((d) => d.stock?.[ORGS.bank.id]?.['O-'])).toBe(5);

    await panel.getByRole('button', { name: 'Discard' }).click();
    await expect(panel.getByText('No batches recorded yet.')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => (await bank.request.get('/api/hospitals/stock')).json().then((d) => d.stock?.[ORGS.bank.id]?.['O-'])).toBe(0);
  });

  test('hospital account lands on its own hospital: stock buttons show and a camp can be scheduled', async ({ browser }) => {
    const page = await signedInPage(browser, ORGS.hospital.email);
    await page.goto('/en/hospitals');
    // No manual hospital pick: the page must already be on this account's own hospital.
    await expect(card(page, 'O+').getByRole('button', { name: '+1' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('View only')).toHaveCount(0);

    await page.getByRole('button', { name: /Camps/ }).first().click();
    await page.getByRole('button', { name: 'Schedule Blood Camp' }).click();
    const modal = page.locator('div.fixed', { has: page.getByRole('heading', { name: 'Schedule Blood Drive' }) });
    await modal.locator('input[type=text]').nth(0).fill(`E2E camp ${RUN}`);
    await modal.locator('input[type=text]').nth(1).fill('E2E Hall');
    await modal.locator('input[type=date]').fill(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));
    await modal.locator('button[type=submit]').click();
    await expect(page.getByText('New blood donation drive scheduled and published!')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(`E2E camp ${RUN}`)).toBeVisible();
  });

  // Screen recording for the owner: `PW_TUTORIAL=1 PW_SLOWMO=700 PW_MODE=real npx playwright test two-hospitals -g tutorial`.
  // Writes tutorial-videos/*.webm. Skipped in normal runs.
  test('tutorial video: stock +/- and blood camp', async ({ browser }) => {
    test.skip(!process.env.PW_TUTORIAL, 'recording only on request');
    const context = await browser.newContext({ recordVideo: { dir: 'tutorial-videos', size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const caption = async (text: string) => {
      await page.evaluate((message) => {
        let el = document.getElementById('tutorial-caption');
        if (!el) {
          el = document.createElement('div');
          el.id = 'tutorial-caption';
          el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#111c;color:#fff;padding:12px 22px;border-radius:14px;font:600 18px system-ui;max-width:90%;text-align:center';
          document.body.appendChild(el);
        }
        el.textContent = message;
      }, text);
      await page.waitForTimeout(2200);
    };
    await page.goto('/en/sign-in');
    await page.getByLabel('Email').fill(ORGS.hospital.email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 20_000 });

    await page.goto('/bn/hospitals');
    await expect(card(page, 'O+').locator('button').nth(1)).toBeVisible({ timeout: 20_000 });
    await caption('১. হাসপাতাল অ্যাকাউন্টে সাইন ইন করলে নিজের হাসপাতাল নিজে থেকেই খোলে');
    await caption('২. প্রতিটি রক্তের গ্রুপে +1 ও -1 বোতাম দেখা যায়');
    await card(page, 'O+').locator('button').nth(1).click();
    await card(page, 'O+').locator('button').nth(1).click();
    await caption('+1 চাপলে মজুত বাড়ে (O+ এখন ২)');
    await card(page, 'O+').locator('button').nth(0).click();
    await caption('-1 চাপলে মজুত কমে (O+ এখন ১)');

    await page.getByRole('button', { name: 'রক্তদান ক্যাম্প ও ড্রাইভ' }).click();
    await caption('৩. ক্যাম্প ট্যাবে যান');
    await page.locator('button', { has: page.locator('span.material-symbols-outlined', { hasText: 'add_box' }) }).click();
    const modal = page.locator('div.fixed.inset-0');
    await modal.locator('input[type=text]').nth(0).fill('রক্তদান ক্যাম্প');
    await modal.locator('input[type=text]').nth(1).fill('সিটি হাসপাতাল হল');
    await modal.locator('input[type=date]').fill(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));
    await caption('৪. নাম, স্থান ও তারিখ লিখুন');
    await modal.locator('button[type=submit]').click();
    await expect(page.getByText('রক্তদান ক্যাম্প').first()).toBeVisible({ timeout: 10_000 });
    await caption('৫. ক্যাম্প তৈরি হয়ে তালিকায় এসেছে');
    await context.close();
  });

  test('a signed-out visitor sees the stock but has no buttons', async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await openHospital(page, ORGS.hospital.name);
    await expect(count(page, 'O+')).toHaveText(/^2\s/);
    await expect(card(page, 'O+').getByRole('button', { name: '+1' })).toHaveCount(0);
    await expect(page.getByText('View only').first()).toBeVisible();
  });
});
