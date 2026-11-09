import { test, expect, type Browser, type Page } from '@playwright/test';
import { ACCOUNTS, ORG, PASSWORD, RUN, SERVICE_KEY, SUPABASE_URL, createAccounts, removeAccounts, signIn, type Who } from './tutorial/accounts.ts';
import { Narrator } from './tutorial/lib.ts';

/**
 * Narrated tutorial videos (Bengali voice), one per part, written to tutorial-videos/*.mp4.
 * Run: `PW_TUTORIAL=1 PW_MODE=real DATABASE_URL=<local postgres> DIRECT_URL=<same> npx playwright test tutorial.spec.ts [-g "পর্ব ১"]`.
 * Needs the real Supabase project in .env.local (test users are created and deleted) and a local Postgres: NEVER point
 * DATABASE_URL at the live database, the tutorials post requests and register donors.
 */
test.describe.serial('tutorial videos', () => {
  test.skip(!process.env.PW_TUTORIAL, 'recording only on request');
  test.setTimeout(10 * 60_000);
  test.use({ actionTimeout: 20_000 });
  void ORG; void RUN; void SERVICE_KEY; void SUPABASE_URL; void ACCOUNTS;
  test.beforeAll(createAccounts);
  test.afterAll(removeAccounts);

  const nav = async (n: Narrator, label: string) => {
    const item = n.page.locator('nav, header').getByText(label, { exact: true }).first();
    await n.highlight(item, 700);
    await item.click();
    await n.page.waitForLoadState('networkidle').catch(() => undefined);
  };
  const scroll = async (page: Page, y: number) => {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
    await page.waitForTimeout(900);
  };
  void signIn; void PASSWORD; void expect;

  /** Someone else (another browser, off camera) answers the request, so the video can show the answer arriving. */
  const respondAs = async (browser: Browser, who: Who, place: string) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, who, 'bn');
    await page.goto('/bn');
    const heading = page.getByRole('heading', { name: place, exact: true });
    await expect(heading).toBeVisible({ timeout: 30_000 });
    const card = heading.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await card.getByRole('button', { name: 'আমি রক্ত দিতে পারব' }).click();
    const phone = page.getByLabel('আপনার ফোন নম্বর');
    if (await phone.isEditable().catch(() => false)) await phone.fill('01912000002');
    const name = page.getByLabel('আপনার নাম');
    if (await name.isEditable().catch(() => false)) await name.fill(ACCOUNTS[who].name);
    await page.getByRole('button', { name: 'পাঠান', exact: true }).click();
    await expect(page.getByText('ধন্যবাদ!')).toBeVisible({ timeout: 15_000 });
    await context.close();
  };

  test('পর্ব ২: রক্তগ্রহীতা, SOS অনুরোধ ও ট্র্যাকিং', async ({ browser }) => {
    const n = await Narrator.start(browser, '02-roktogrohita-sos-o-tracking');
    const { page } = n;
    page.on('dialog', (dialog) => void dialog.accept());
    const place = `${ORG.name}`;
    await page.goto('/bn');
    await n.title(
      'পর্ব ২ / ৬',
      'রক্তগ্রহীতা: SOS অনুরোধ ও ট্র্যাকিং',
      'সাইন ইন, জরুরি রক্তের অনুরোধ পোস্ট, ডোনারের সাড়া ও অনুরোধ সম্পন্ন করা',
      'দ্বিতীয় পর্বে দেখব, রক্তগ্রহীতা অর্থাৎ যাঁর রোগীর রক্ত দরকার, তিনি কীভাবে সাইন ইন করে অনুরোধ পোস্ট করেন এবং শুরু থেকে শেষ পর্যন্ত তা অনুসরণ করেন।'
    );
    await n.say('জরুরি অনুরোধ পোস্ট করতে সাইন ইন লাগে, যাতে ভুয়া অনুরোধ আটকানো যায়। ওপরের সাইন ইন বোতামে চাপ দিই।', async () => {
      await n.highlight(page.getByRole('link', { name: /সাইন ইন/ }).or(page.getByRole('button', { name: /সাইন ইন/ })), 900);
      await page.goto('/bn/sign-in');
    });
    await n.say('ইমেইল ও পাসওয়ার্ড দিয়ে সাইন ইন করা যায়। গুগল অ্যাকাউন্ট দিয়েও যাওয়া যায়।', async () => {
      await page.getByLabel('ইমেইল').fill(ACCOUNTS.seeker.email);
      await page.getByLabel('পাসওয়ার্ড', { exact: true }).fill(PASSWORD);
      await page.locator('form button[type=submit]').first().click();
      await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 });
    });
    await nav(n, 'SOS রিকোয়েস্ট তৈরি');
    await n.say('এটি রক্ত চাই ফর্ম। অল্প কয়েকটি তথ্য দিলেই হয়। প্রথমে রক্তের গ্রুপ বেছে নিই, ধরা যাক এবি নেগেটিভ।', async () => {
      await page.getByRole('button', { name: 'AB-', exact: true }).click();
    });
    await n.say('রোগীর সমস্যা এক ক্লিকে বেছে নেওয়া যায়, যেমন অপারেশন। রক্তের পরিমাণ বাড়ানো-কমানোর বোতামও আছে।', async () => {
      await page.getByRole('button', { name: 'অপারেশন', exact: true }).click();
    });
    await n.say('রক্তদানের স্থান অর্থাৎ হাসপাতালের নাম এবং যোগাযোগের মোবাইল নম্বর দিই। শুধু এই তিনটি তথ্য বাধ্যতামূলক।', async () => {
      await page.getByLabel('রক্তদানের স্থান').fill(place);
      await page.getByLabel('যোগাযোগের নম্বর').fill('01912000001');
    });
    await n.say('ডান পাশে বা নিচে দেখা যাচ্ছে, মানুষ ঠিক কেমন পোস্ট দেখবে। এবার SOS পোস্ট করুন বোতামে চাপ দিই।', async () => {
      await scroll(page, 700);
      await page.getByRole('button', { name: 'SOS পোস্ট করুন' }).click();
      await expect(page.locator('h1').filter({ hasText: 'SOS' }).first()).toBeVisible({ timeout: 30_000 });
    });
    await n.say('পোস্ট হয়ে গেছে। সাথে সাথে হোয়াটসঅ্যাপ ও ফেসবুকে শেয়ার করা যায়, অথবা পোস্টটি কপি করা যায়। এ সময় সিস্টেম নিজে থেকেই কাছের, উপযুক্ত ও প্রস্তুত রক্তদাতাদের নোটিফিকেশন পাঠায়।', async () => {
      await page.waitForTimeout(500);
    });
    await n.say('এখন এই রিকোয়েস্ট ট্র্যাক করুন বোতামে চাপ দিই।', async () => {
      await page.getByRole('button', { name: 'এই রিকোয়েস্ট ট্র্যাক করুন' }).click();
      await page.waitForLoadState('networkidle').catch(() => undefined);
    });
    await n.say('এটি রিকোয়েস্ট ট্র্যাকিং পেজ। ওপরে আমার রিকোয়েস্ট, অপেক্ষারত, ডোনার পাওয়া গেছে, সম্পন্ন ও বাতিল, এই ভাগে অনুরোধগুলো সাজানো থাকে।', async () => {
      await page.getByRole('button', { name: /আমার রিকোয়েস্ট/ }).click();
    });
    const mine = page.locator('div.rounded-2xl', { hasText: place }).first();
    await n.say('নিচে আমাদের অনুরোধটি দেখা যাচ্ছে। তিনটি ধাপের একটি অগ্রগতির দাগ আছে: রিকোয়েস্ট পোস্ট হয়েছে, ডোনার পাওয়া গেছে, রক্তদান সম্পন্ন। এখন আমরা প্রথম ধাপে আছি।', async () => {
      await n.highlight(mine, 2000);
    });
    await n.say('এবার ধরা যাক, একজন রক্তদাতা অন্য ফোন থেকে সাড়া দিলেন। সেটি আমরা আলাদা করে করে নিচ্ছি।', async () => {
      await respondAs(browser, 'donor', place);
    });
    await n.say('পেজটি নতুন করে খুললে দেখা যায়, রিকোয়েস্টের অবস্থা বদলে ডোনার পাওয়া গেছে হয়েছে।', async () => {
      await page.reload();
      await page.getByRole('button', { name: /আমার রিকোয়েস্ট/ }).click();
    });
    await n.say('সাড়া বোতামে চাপলে কারা সাড়া দিয়েছেন তাঁদের নাম ও ফোন নম্বর দেখা যায়। এই ফোন নম্বর শুধু রিকোয়েস্ট যিনি দিয়েছেন, তিনিই দেখতে পান, অন্য কেউ নয়।', async () => {
      await mine.getByRole('button', { name: /সাড়া \(/ }).click();
      await page.waitForTimeout(1500);
    });
    await n.say('রক্ত পাওয়া গেলে সম্পন্ন হয়েছে বোতামে চাপি। তখন সিস্টেম জানতে চায়, কে কে সত্যিই রক্ত দিয়েছেন।', async () => {
      await mine.getByRole('button', { name: 'সম্পন্ন হয়েছে' }).click();
      await page.waitForTimeout(1200);
    });
    await n.say('যাঁরা রক্ত দিয়েছেন তাঁদের টিক দিয়ে নিশ্চিত করলে প্রত্যেকে একটি ডোনেশন কোড পান এবং তাঁদের রক্তদানের ইতিহাসে এটি যুক্ত হয়ে যায়।', async () => {
      await page.getByRole('button', { name: 'রিকোয়েস্ট সম্পন্ন করুন' }).click();
      await page.waitForTimeout(1500);
    });
    await n.say('অনুরোধটি এখন সম্পন্ন তালিকায় চলে গেছে। এভাবেই একটি রক্তের অনুরোধ পোস্ট থেকে সম্পন্ন হওয়া পর্যন্ত পুরোটা এক জায়গায় অনুসরণ করা যায়।', async () => {
      await page.getByRole('button', { name: /সম্পন্ন/ }).first().click().catch(() => undefined);
    });
    await n.say('দ্বিতীয় পর্ব এখানে শেষ। পরের পর্বে দেখব, একজন রক্তদাতা কীভাবে নিবন্ধন করেন এবং নিজের প্রোফাইল চালান।');
    console.log('VIDEO', await n.finish());
  });

  test('পর্ব ১: পরিচিতি, জরুরি হাব ও ডোনার খোঁজা', async ({ browser }) => {
    const n = await Narrator.start(browser, '01-porichiti-jaruri-hub-o-donor-khoja');
    const { page } = n;
    await page.goto('/bn');
    await n.title(
      'পর্ব ১ / ৬',
      'পরিচিতি, জরুরি হাব ও ডোনার খোঁজা',
      'যে কেউ, সাইন ইন ছাড়াই, জরুরি রক্তের অনুরোধ দেখতে ও রক্তদাতা খুঁজতে পারেন',
      'আসসালামু আলাইকুম। এই ভিডিও সিরিজে আমরা ব্লাড লাগবে প্রকল্পটি পুরোটা ধাপে ধাপে দেখাব। প্রথম পর্বে থাকছে প্রকল্পের পরিচিতি, জরুরি হাব এবং রক্তদাতা খোঁজার পদ্ধতি।'
    );
    await n.say('ব্লাড লাগবে হলো বাংলাদেশের জন্য একটি রক্তদান ও রক্তের অনুরোধের প্ল্যাটফর্ম। এখানে রক্তদাতা, রক্তগ্রহীতা, হাসপাতাল ও অ্যাডমিন, এই চার ধরনের মানুষ একই সাইটে কাজ করেন। সাইটটি বাংলা ও ইংরেজি, দুই ভাষাতেই চলে।', async () => {
      await page.waitForTimeout(500);
    });
    await n.say('একদম ওপরের লাল পট্টিতে সবচেয়ে জরুরি রক্তের অনুরোধ চলমান অক্ষরে দেখানো হয়। সাথে আছে জাতীয় জরুরি হটলাইন নম্বর।', async () => {
      await n.highlight(page.locator('body > div, header').first(), 100);
    });
    await n.say('এটি জরুরি হাব, অর্থাৎ হোম পেজ। এখান থেকেই যে কেউ রক্তের জন্য অনুরোধ পোস্ট করতে পারেন।', async () => {
      await n.highlight(page.getByRole('button', { name: /রক্তের রিকোয়েস্ট পোস্ট করুন/ }), 1600);
    });
    await n.say('রক্তের গ্রুপ বেছে নিলে শুধু সেই গ্রুপের অনুরোধগুলো দেখা যায়। যেমন, এখন O পজিটিভ বেছে নিলাম।', async () => {
      await scroll(page, 380);
      await page.getByRole('button', { name: 'O+', exact: true }).first().click();
    });
    await n.say('প্রতিটি অনুরোধে রক্তের গ্রুপ, কত ব্যাগ লাগবে, কোন হাসপাতালে, এবং সাড়া দেওয়ার জন্য কতটুকু সময় বাকি, সবকিছু লেখা থাকে।', async () => {
      await scroll(page, 560);
    });
    await n.say('ডান পাশে আছে চব্বিশ ঘণ্টার জরুরি হটলাইন, যেমন বাংলাদেশ রেড ক্রিসেন্ট ও সরকারি জরুরি নম্বর।', async () => {
      await scroll(page, 700);
    });
    await n.say('ভাষা বদলাতে ওপরের ইংরেজি বোতাম চাপুন। পুরো সাইট সাথে সাথে ইংরেজিতে চলে যায়।', async () => {
      await scroll(page, 0);
      await page.getByRole('button', { name: /English/ }).first().click();
      await page.waitForTimeout(1800);
    });
    await n.say('আবার বাংলায় ফিরে আসা যায় একইভাবে।', async () => {
      await page.getByRole('button', { name: /বাংলা|BN|Bangla/i }).first().click().catch(async () => page.goto('/bn'));
      await page.waitForTimeout(1200);
    });
    await page.goto('/bn');
    await nav(n, 'ডোনার খুঁজুন');
    await n.say('এবার ডোনার খুঁজুন পেজ। এখানে সাইন ইন ছাড়াই স্বেচ্ছাসেবী রক্তদাতাদের তালিকা দেখা যায়।', async () => {
      await page.waitForTimeout(500);
    });
    await n.say('রক্তের গ্রুপ দিয়ে ছাঁকনি দেওয়া যায়। এখানে বি পজিটিভ বেছে নিলাম।', async () => {
      await page.getByRole('button', { name: 'B+', exact: true }).first().click();
    });
    await n.say('নাম, এলাকা বা বিভাগ লিখেও খোঁজা যায়। আর শুধু যারা এখন রক্ত দিতে প্রস্তুত, তাদের টিক দেওয়া থাকলে কেবল তাদেরই দেখায়।', async () => {
      await page.getByPlaceholder(/ডোনারের নাম/).fill('ঢাকা');
      await n.highlight(page.getByText('বর্তমানে প্রস্তুত').first(), 1200);
    });
    await n.say('প্রতিটি ডোনার কার্ডে ডোনারের ছবি বা নামের অক্ষর, রক্তের গ্রুপ, এলাকা এবং সরাসরি কল করার বোতাম থাকে। রক্তদান সম্পূর্ণ বিনামূল্যে ও স্বেচ্ছাসেবী, কেনাবেচা নিষিদ্ধ।', async () => {
      await page.getByPlaceholder(/ডোনারের নাম/).fill('');
      await page.getByRole('button', { name: 'সব', exact: true }).first().click();
      await scroll(page, 450);
    });
    await nav(n, 'ব্যবহার নির্দেশিকা');
    await n.say('সবশেষে ব্যবহার নির্দেশিকা। প্রতিটি কাজ কীভাবে করতে হয়, বাংলায় ধাপে ধাপে এখানে লেখা আছে, যাতে নতুন কেউ সহজেই শিখে নিতে পারেন।', async () => {
      await scroll(page, 300);
    });
    await n.say('প্রথম পর্ব এখানেই শেষ। পরের পর্বে দেখব, রক্তগ্রহীতা কীভাবে সাইন ইন করে জরুরি রক্তের অনুরোধ পোস্ট করেন এবং তা ট্র্যাক করেন।');
    console.log('VIDEO', await n.finish());
  });
});
