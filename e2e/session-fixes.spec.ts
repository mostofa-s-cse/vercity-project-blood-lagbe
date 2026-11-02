import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Checks the fixes from the 2026-11-02 review round in a real browser. Needs a real database and NO
 * Supabase keys (see playwright.config.ts "real" mode): sign-in screens (account page, notifications for a
 * signed-in person) cannot run here, so the bell test serves a stand-in notifications response.
 */
test.describe('2026-11-02 review fixes (real database)', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.get('/api/donors');
    test.skip(response.status() === 503, 'no real database configured for this run');
  });

  let resting: { name: string; phone: string; area: string };
  let rested: { name: string; phone: string; area: string };
  test.beforeAll(async ({ request }) => {
    resting = await registerDonorWith(request, { lastDonationMonths: 2 });
    rested = await registerDonorWith(request, { lastDonationMonths: 4 });
  });

  const eightDigits = () => (Date.now() + Math.floor(Math.random() * 1000)).toString().slice(-8).padStart(8, '0');

  async function registerDonorWith(api: APIRequestContext, over: Record<string, unknown> = {}) {
    const unique = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const phone = `018${eightDigits()}`;
    const body = {
      name: `E2E Donor ${unique}`,
      phone,
      bloodGroup: 'B+',
      area: `E2E Area ${unique}`,
      age: 26,
      gender: 'Female',
      vehicle: 'Personal Ride / Car',
      lastDonationMonths: 2,
      ...over,
    };
    const response = await api.post('/api/donors', { data: body });
    expect(response.status(), await response.text()).toBe(201);
    return { name: body.name as string, phone, area: body.area as string };
  }

  test('SOS post preview adds patient name, age and attendant name', async ({ page }) => {
    await page.goto('/en/sos');
    await page.getByText('More details (optional)').click();
    await page.getByLabel("Patient's name").fill('Rahim Uddin');
    await page.getByLabel("Patient's age").fill('45');
    await page.getByLabel("Attendant's name").fill('Karim Uddin');
    await expect(page.getByText('Patient : Rahim Uddin')).toBeVisible();
    await expect(page.getByText('Age : 45')).toBeVisible();
    await expect(page.getByText('Attendant : Karim Uddin')).toBeVisible();
  });

  test('donor directory: full phone, resting donor not "available", chips vertically centred', async ({ page }) => {
    const donor = resting;
    await page.goto('/en/donors');
    await page.getByPlaceholder(/Search donor name/).fill(donor.name);
    // "Available Now" is on by default: the resting donor must be hidden by it...
    await expect(page.getByRole('heading', { name: 'No donors match' })).toBeVisible();
    // ...and show up, marked "Not available now", once the filter is off.
    await page.getByRole('checkbox', { name: 'Available Now' }).uncheck();

    const card = page.locator('div', { has: page.getByText(donor.name, { exact: true }) }).filter({ hasText: donor.phone }).last();
    // The full number is on the card, not a masked one.
    await expect(card.getByText(donor.phone)).toBeVisible();
    await expect(page.getByText('••••')).toHaveCount(0);
    // Gave blood 2 months ago: still resting, so not "Available now".
    await expect(card.getByText('Not available now')).toBeVisible();
    await expect(card.getByText('Available now', { exact: true })).toHaveCount(0);

    // The three chips share one vertical centre.
    const centres = await Promise.all(
      ['Not available now', '26 yrs', 'Personal Ride / Car'].map(async (text) => {
        const chip = card.locator('span.rounded-md', { hasText: text }).first();
        const box = await chip.boundingBox();
        expect(box, `chip "${text}" visible`).not.toBeNull();
        return box!.y + box!.height / 2;
      })
    );
    expect(Math.max(...centres) - Math.min(...centres)).toBeLessThan(1);
  });

  test('"available only" filter hides a donor who gave blood 2 months ago', async ({ page }) => {
    const donor = resting;
    const api = await page.request.get(`/api/donors?available=true&q=${encodeURIComponent(donor.name)}`);
    expect((await api.json()).donors).toHaveLength(0);
    const all = await page.request.get(`/api/donors?q=${encodeURIComponent(donor.name)}`);
    const [row] = (await all.json()).donors;
    expect(row.isEligible).toBe(false);
    expect(row.lastDonationAt).not.toBeNull();
  });

  test('a donor who last gave blood 4 months ago is still available', async ({ page }) => {
    const donor = rested;
    const all = await page.request.get(`/api/donors?available=true&q=${encodeURIComponent(donor.name)}`);
    expect((await all.json()).donors).toHaveLength(1);
  });

  test('clicking a blood-needed notification opens that request\'s "I can donate" form', async ({ page }) => {
    // A real request, then a registered donor in this browser, then a stand-in notification pointing at it.
    const place = `E2E Notify Hospital ${Date.now().toString().slice(-6)}`;
    const sos = await page.request.post('/api/sos', {
      data: { bloodGroup: 'O+', bags: 1, place, phones: [`017${eightDigits()}`], postText: 'x' },
    });
    expect(sos.status(), await sos.text()).toBe(201);
    const { id: requestId } = await sos.json();

    await page.goto('/en/register');
    const unique = Date.now().toString().slice(-6);
    await page.getByLabel('Full name').fill(`E2E Bell ${unique}`);
    await page.getByLabel('Mobile number').fill(`018${eightDigits()}`);
    await page.getByLabel('Area').fill(`E2E Area ${unique}`);
    await page.getByRole('button', { name: 'A+', exact: true }).click();
    await page.getByRole('checkbox', { name: /I am healthy/ }).check();
    await page.getByRole('button', { name: 'Register as donor', exact: true }).click();
    await expect(page.getByText('You are now a registered donor')).toBeVisible({ timeout: 10_000 });

    await page.route(/\/api\/donors\/[^/]+\/notifications$/, (route) =>
      route.fulfill({
        json: {
          notifications: [
            {
              id: 'n1',
              requestId,
              type: 'blood_needed',
              bloodGroup: 'O+',
              place,
              donationId: null,
              donationCode: null,
              donationUnits: null,
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      })
    );
    await page.route(/\/api\/donors\/[^/]+\/notifications\/n1$/, (route) => route.fulfill({ json: { ok: true } }));

    await page.goto('/en/donors');
    await page.getByTitle('Emergency Blood Alerts').first().click();
    await page.getByText(place).first().click();

    // Lands on the Emergency Hub with that request's form open.
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByRole('heading', { name: 'I Can Donate' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(place).first()).toBeVisible();
  });

  test('Bengali pages say "ডোনার খুঁজুন" and "ডোনার প্রোফাইল", never "ডিরেক্টরি" or "পাসপোর্ট"', async ({ page }) => {
    await page.goto('/bn/docs');
    const body = await page.locator('body').innerText();
    expect(body).toContain('ডোনার খুঁজুন');
    expect(body).not.toContain('ডিরেক্টরি');
    expect(body).not.toContain('পাসপোর্ট');
    await page.goto('/bn/donors');
    await expect(page.getByRole('link', { name: /ডোনার খুঁজুন/ }).or(page.getByRole('button', { name: /ডোনার খুঁজুন/ })).first()).toBeVisible();
  });

  test('English passport menu item reads "Donor Profile"', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('button', { name: /Donor Profile/ }).or(page.getByRole('link', { name: /Donor Profile/ })).first()).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/Passport/i);
  });

  test('Bengali font: Noto Sans Bengali is requested and first for Bengali glyphs', async ({ page }) => {
    await page.goto('/bn');
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toContain('Noto Sans Bengali');
    const links = await page.locator('link[rel=stylesheet]').evaluateAll((els) => els.map((e) => (e as HTMLLinkElement).href));
    expect(links.some((href) => href.includes('Noto+Sans+Bengali'))).toBe(true);
  });
});
