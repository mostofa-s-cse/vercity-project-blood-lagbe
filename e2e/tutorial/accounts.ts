import { expect, type Browser, type Page } from '@playwright/test';
import { getPrisma } from '../../src/lib/prisma.ts';
import { ADMIN_PERMISSIONS } from '../../src/lib/permissions.ts';

/** Test accounts for the tutorial videos: real Supabase users (created and deleted through the admin API) and one approved organization in the database. */
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: the spec skips itself
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const RUN = 'demo';
export const DONOR_PHONE = `019${Date.now().toString().slice(-8)}`;
export const PASSWORD = `Tut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}!A1`;

export const ORG = { id: 'tut-hosp-demo', name: 'সিটি জেনারেল হাসপাতাল (ডেমো)' };
export const ACCOUNTS = {
  seeker: { email: `tut.seeker.${RUN}@mailinator.com`, name: 'রহিম উদ্দিন', meta: {} as Record<string, unknown> },
  // A new donor login for every run: registering twice with the same login is not allowed, and nothing may be deleted.
  donor: { email: `tut.donor.${Date.now().toString(36)}@mailinator.com`, name: 'করিম হাসান', meta: {} as Record<string, unknown> },
  hospital: {
    email: `tut.hospital.${RUN}@mailinator.com`,
    name: 'সিটি জেনারেল হাসপাতাল স্টাফ',
    meta: { role: 'hospital', role_name: 'Hospital staff', permissions: ['stock.own', 'camps.create'], hospital_id: ORG.id } as Record<string, unknown>,
  },
  admin: {
    email: `tut.admin.${RUN}@mailinator.com`,
    name: 'সিস্টেম অ্যাডমিন',
    meta: { role: 'admin', role_name: 'Admin', permissions: [...ADMIN_PERMISSIONS] } as Record<string, unknown>,
  },
};
export type Who = keyof typeof ACCOUNTS;
const userIds: string[] = [];

async function adminFetch(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...init.headers },
  });
}

/**
 * Runs against the live project, so nothing is ever deleted. Accounts and the demo organization are reused between runs
 * (found by email / fixed id), their password is reset for this run, and `removeAccounts` bans the logins afterwards.
 */
export async function createAccounts() {
  const prisma = getPrisma();
  await prisma.organization.upsert({
    where: { id: ORG.id },
    update: {},
    create: { id: ORG.id, name: ORG.name, type: 'private_hospital', status: 'approved', isVerified: true, address: 'ধানমন্ডি, ঢাকা', licenseNumber: 'TUT-DEMO', division: 'Dhaka', district: 'Dhaka', hotline: '01711000000' },
  });
  const existing = (await (await adminFetch('users?per_page=1000')).json()) as { users?: { id: string; email: string }[] };
  for (const account of Object.values(ACCOUNTS)) {
    const body = { email: account.email, password: PASSWORD, email_confirm: true, ban_duration: 'none', app_metadata: account.meta, user_metadata: { full_name: account.name, name: account.name } };
    const found = existing.users?.find((user) => user.email === account.email);
    const response = found
      ? await adminFetch(`users/${found.id}`, { method: 'PUT', body: JSON.stringify(body) })
      : await adminFetch('users', { method: 'POST', body: JSON.stringify(body) });
    expect(response.status, await response.clone().text()).toBeLessThan(300);
    userIds.push(((await response.json()) as { id: string }).id);
  }
}

/** Deletes nothing. Bans the demo logins again (reversible) so no privileged account is left usable. */
export async function removeAccounts() {
  for (const id of userIds) await adminFetch(`users/${id}`, { method: 'PUT', body: JSON.stringify({ ban_duration: '876000h' }) }).catch(() => undefined);
}

export async function signIn(page: Page, who: Who, lang: 'en' | 'bn' = 'en') {
  await page.goto(`/${lang}/sign-in`);
  await page.getByLabel(lang === 'en' ? 'Email' : 'ইমেইল').fill(ACCOUNTS[who].email);
  await page.getByLabel(lang === 'en' ? 'Password' : 'পাসওয়ার্ড', { exact: true }).fill(PASSWORD);
  await page.locator('form button[type=submit]').first().click();
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 20_000 });
}

export async function signedInContext(browser: Browser, who: Who) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, who);
  const state = await context.storageState();
  await context.close();
  return state;
}
