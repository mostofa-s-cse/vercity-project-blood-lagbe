import { test, expect, type Browser, type Page } from '@playwright/test';
import { ACCOUNTS, DONOR_PHONE, ORG, PASSWORD, RUN, SERVICE_KEY, SUPABASE_URL, createAccounts, removeAccounts, signIn, type Who } from './tutorial/accounts.ts';
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
    const donate = page.getByRole('button', { name: 'আমি রক্ত দিতে পারব' });
    // Newest test request at the demo hospital (the card heading is the problem text we chose: 'অপারেশন').
    const card = page.locator('xpath=//h4[normalize-space()="অপারেশন"]/ancestor::div[contains(@class,"rounded-2xl")][1]').filter({ hasText: place }).filter({ has: donate }).first();
    // The list can load slowly: reload and look again a few times before giving up.
    for (let attempt = 0; attempt < 4 && !(await card.isVisible().catch(() => false)); attempt++) {
      await page.waitForTimeout(6000);
      await page.reload();
      await card.waitFor({ timeout: 15_000 }).catch(() => undefined);
    }
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'আমি রক্ত দিতে পারব' }).first().click();
    const phone = page.getByLabel('আপনার ফোন নম্বর');
    if (await phone.isEditable().catch(() => false)) await phone.fill('01912000002');
    const name = page.getByLabel('আপনার নাম');
    if (await name.isEditable().catch(() => false)) await name.fill(ACCOUNTS[who].name);
    const send = page.getByRole('button', { name: /পাঠান/ }).last();
    try {
      await send.click({ timeout: 15_000 });
    } catch (error) {
      await page.screenshot({ path: 'tutorial-videos/.debug-respond.png' });
      console.log('RESPOND_BUTTONS', JSON.stringify(await page.getByRole('button').allInnerTexts()));
      console.log('RESPOND_INPUTS', JSON.stringify(await page.locator('input:visible').evaluateAll((els) => els.map((el) => `${(el as HTMLInputElement).placeholder}|${(el as HTMLInputElement).value}|${(el as HTMLInputElement).disabled}`))));
      throw error;
    }
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
      'পর্ব ২ / ৫',
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
    if (!process.env.TUT_SKIP_POST) {
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
        // The form can reset when the sign-in finishes loading late: refill whatever is missing until Post is enabled.
        const submit = page.getByRole('button', { name: 'SOS পোস্ট করুন' });
        for (let attempt = 0; attempt < 5 && !(await submit.isEnabled()); attempt++) {
          await scroll(page, 0);
          const group = page.getByRole('button', { name: 'AB-', exact: true });
          if ((await group.getAttribute('aria-pressed')) !== 'true') await group.click();
          await page.getByLabel('রক্তদানের স্থান').fill(place);
          await page.getByLabel('যোগাযোগের নম্বর').fill('01912000001');
          await page.waitForTimeout(1500);
        }
        await submit.click();
        await expect(page.locator('h1').filter({ hasText: 'SOS' }).first()).toBeVisible({ timeout: 30_000 });
      });
      await n.say('পোস্ট হয়ে গেছে। সাথে সাথে হোয়াটসঅ্যাপ ও ফেসবুকে শেয়ার করা যায়, অথবা পোস্টটি কপি করা যায়। এ সময় সিস্টেম নিজে থেকেই কাছের, উপযুক্ত ও প্রস্তুত রক্তদাতাদের নোটিফিকেশন পাঠায়।', async () => {
        await page.waitForTimeout(500);
      });
      await n.say('এখন এই রিকোয়েস্ট ট্র্যাক করুন বোতামে চাপ দিই।', async () => {
        await page.getByRole('button', { name: 'এই রিকোয়েস্ট ট্র্যাক করুন' }).click();
        await page.waitForLoadState('networkidle').catch(() => undefined);
      });
    } else {
      await page.goto('/bn/tracking');
    }
    await n.say('এটি রিকোয়েস্ট ট্র্যাকিং পেজ। ওপরে আমার রিকোয়েস্ট, অপেক্ষারত, ডোনার পাওয়া গেছে, সম্পন্ন ও বাতিল, এই ভাগে অনুরোধগুলো সাজানো থাকে।', async () => {
      await page.getByRole('tab', { name: /আমার রিকোয়েস্ট/ }).click();
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
      await page.getByRole('tab', { name: /আমার রিকোয়েস্ট/ }).click();
    });
    const answered = page; // the newest request is the one the donor just answered, so the first matching buttons are its buttons

    await n.say('সাড়া বোতামে চাপলে কারা সাড়া দিয়েছেন তাঁদের নাম ও ফোন নম্বর দেখা যায়। এই ফোন নম্বর শুধু রিকোয়েস্ট যিনি দিয়েছেন, তিনিই দেখতে পান, অন্য কেউ নয়।', async () => {
      await answered.getByRole('button', { name: /সাড়া \(/ }).first().click();
      await page.waitForTimeout(1500);
    });
    await n.say('রক্ত পাওয়া গেলে সম্পন্ন হয়েছে বোতামে চাপি। তখন সিস্টেম জানতে চায়, কে কে সত্যিই রক্ত দিয়েছেন।', async () => {
      await answered.getByRole('button', { name: 'সম্পন্ন হয়েছে' }).first().click();
      await page.waitForTimeout(1200);
    });
    await n.say('যাঁরা রক্ত দিয়েছেন তাঁদের টিক দিয়ে নিশ্চিত করলে প্রত্যেকে একটি ডোনেশন কোড পান এবং তাঁদের রক্তদানের ইতিহাসে এটি যুক্ত হয়ে যায়।', async () => {
      await page.getByRole('checkbox').first().check();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'রিকোয়েস্ট সম্পন্ন করুন' }).click();
      await page.waitForTimeout(1500);
    });
    await n.say('অনুরোধটি এখন সম্পন্ন তালিকায় চলে গেছে। এভাবেই একটি রক্তের অনুরোধ পোস্ট থেকে সম্পন্ন হওয়া পর্যন্ত পুরোটা এক জায়গায় অনুসরণ করা যায়।', async () => {
      await page.getByRole('button', { name: /সম্পন্ন/ }).first().click().catch(() => undefined);
    });
    await n.say('দ্বিতীয় পর্ব এখানে শেষ। পরের পর্বে দেখব, একজন রক্তদাতা কীভাবে নিবন্ধন করেন এবং নিজের প্রোফাইল চালান।');
    console.log('VIDEO', await n.finish());
  });

  const signInOnCamera = async (n: Narrator, who: Who) => {
    const { page } = n;
    await page.goto('/bn/sign-in');
    await page.getByLabel('ইমেইল').fill(ACCOUNTS[who].email);
    await page.getByLabel('পাসওয়ার্ড', { exact: true }).fill(PASSWORD);
    await page.locator('form button[type=submit]').first().click();
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 30_000 });
  };

  test('পর্ব ৩: রক্তদাতা, নিবন্ধন ও প্রোফাইল', async ({ browser }) => {
    const n = await Narrator.start(browser, '03-roktodata-nibondhon-o-profile');
    const { page } = n;
    await page.goto('/bn');
    await n.title(
      'পর্ব ৩ / ৫',
      'রক্তদাতা: নিবন্ধন, প্রোফাইল ও সাড়া দেওয়া',
      'ডোনার হিসেবে নিবন্ধন, নিজের প্রোফাইল পরিচালনা, নোটিফিকেশন ও রক্তের অনুরোধে সাড়া',
      'তৃতীয় পর্বে দেখব, একজন রক্তদাতা কীভাবে নিবন্ধন করেন, নিজের প্রোফাইল চালান এবং কোনো রোগীর অনুরোধে সাড়া দেন।'
    );
    await n.say('প্রথমে রক্তদাতা তাঁর অ্যাকাউন্টে সাইন ইন করেন।', async () => {
      await signInOnCamera(n, 'donor');
    });
    await nav(n, 'ডোনার রেজিস্ট্রেশন');
    await n.say('রক্তদাতা হিসেবে নিবন্ধন করতে মাত্র কয়েকটি তথ্য লাগে। নাম সাইন ইন করা অ্যাকাউন্ট থেকেই এসে গেছে। এখন মোবাইল নম্বর দিই।', async () => {
      await page.getByLabel('মোবাইল নম্বর').fill(DONOR_PHONE);
    });
    await n.say('এরপর রক্তের গ্রুপ বেছে নিই, ধরা যাক ও নেগেটিভ, এবং এলাকার নাম লিখি।', async () => {
      await page.getByRole('button', { name: 'O-', exact: true }).click();
      await page.getByLabel('এলাকা').first().fill('ধানমন্ডি');
    });
    await n.say('বিভাগ ও জেলা বেছে নিই, যাতে কাছের রক্তের অনুরোধ এই ডোনারের কাছে পৌঁছায়।', async () => {
      await page.getByLabel('বিভাগ').first().selectOption({ index: 1 });
      await page.waitForTimeout(600);
      await page.getByLabel('জেলা').first().selectOption({ index: 1 });
    });
    await n.say('শেষে নিশ্চিত করার বাক্সে টিক দিয়ে নিবন্ধন করি। চাইলে বয়স, ওজন ও শেষ রক্তদানের তথ্যও দেওয়া যায়, তবে এগুলো ঐচ্ছিক।', async () => {
      await page.locator('input[type=checkbox][id$="pledge"]').check();
      await page.getByRole('button', { name: 'রক্তদাতা হিসেবে নিবন্ধন করুন' }).click();
      await expect(page.getByText('আপনি এখন নিবন্ধিত রক্তদাতা')).toBeVisible({ timeout: 30_000 });
    });
    await n.say('নিবন্ধন সম্পন্ন। এখন এই ব্যক্তি রক্তদাতাদের তালিকায় আছেন এবং জরুরি অনুরোধে সিস্টেম তাঁকে খুঁজে নিতে পারবে।', async () => {
      await page.waitForTimeout(500);
    });
    await n.say('নিচে আমার ডোনার প্রোফাইল অংশে এখন রক্ত দিতে প্রস্তুত আছি কিনা, তা এক ক্লিকে বদলানো যায়। আবার শেষ রক্তদানের সময় এবং বর্তমান ঠিকানাও এখান থেকে বদলানো যায়।', async () => {
      await scroll(page, 500);
    });
    await n.say('ওপরের ঘণ্টার চিহ্নে নোটিফিকেশন দেখা যায়। কাছের কোনো রোগীর রক্ত দরকার হলে এখানে জানানো হয়।', async () => {
      await scroll(page, 0);
      await page.getByRole('button', { name: 'notifications' }).click();
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
    });
    await nav(n, 'জরুরি হাব');
    await n.say('জরুরি হাবে কোনো অনুরোধ দেখে আমি রক্ত দিতে পারব বোতামে চাপ দিই।', async () => {
      const donate = page.getByRole('button', { name: 'আমি রক্ত দিতে পারব' });
      const card = page.locator('xpath=//h4[normalize-space()="অপারেশন"]/ancestor::div[contains(@class,"rounded-2xl")][1]').filter({ hasText: ORG.name }).filter({ has: donate }).first();
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.getByRole('button', { name: 'আমি রক্ত দিতে পারব' }).first().click();
    });
    await n.say('নাম ও ফোন নম্বর অ্যাকাউন্ট থেকে নেওয়া হয়। ফোন নম্বর শুধু অনুরোধকারীই দেখতে পান। পাঠান বোতামে চাপলেই রোগীর পরিবার জানতে পারে।', async () => {
      const phone = page.getByLabel('আপনার ফোন নম্বর');
      if (await phone.isEditable().catch(() => false)) await phone.fill(DONOR_PHONE);
      await page.getByRole('button', { name: /পাঠান/ }).last().click();
      await expect(page.getByText('ধন্যবাদ!')).toBeVisible({ timeout: 20_000 });
    });
    await n.say('এবার ডোনার প্রোফাইল পেজে যাই।', async () => {
      await page.keyboard.press('Escape');
      await page.goto('/bn/passport');
      await page.waitForLoadState('networkidle').catch(() => undefined);
    });
    await n.say('এটি ডোনার প্রোফাইল বা পাসপোর্ট। এখানে ডোনারের নাম, রক্তের গ্রুপ, এলাকা, প্রস্তুত থাকার অবস্থা এবং রক্তদানের ইতিহাস দেখা যায়।', async () => {
      await scroll(page, 300);
    });
    await n.say('শেষ রক্তদানের পর ৯০ দিন পার না হলে সিস্টেম নিজেই ডোনারকে অনুপযুক্ত দেখায়, যাতে নিরাপদ ব্যবধান বজায় থাকে। কোনো অনুরোধ সম্পন্ন হলে ডোনেশন নিজে থেকেই এই ইতিহাসে যুক্ত হয়।', async () => {
      await scroll(page, 700);
    });
    await n.say('অ্যাকাউন্ট পেজ থেকে নাম, ফোন, ইমেইল ও প্রোফাইল ছবি বদলানো যায়।', async () => {
      await page.goto('/bn/account');
      await page.waitForTimeout(1200);
    });
    await n.say('তৃতীয় পর্ব এখানে শেষ। পরের পর্বে দেখব, হাসপাতাল কীভাবে রক্তের মজুত ও রক্তদান ক্যাম্প পরিচালনা করে।');
    console.log('VIDEO', await n.finish());
  });

  const card = (page: Page, group: string) =>
    page.locator('div.p-4.rounded-2xl.border', { has: page.locator('span.text-2xl', { hasText: new RegExp(`^${group.replace('+', '\\+')}$`) }) });

  test('পর্ব ৪: হাসপাতাল, রক্তের মজুত ও ক্যাম্প', async ({ browser }) => {
    const n = await Narrator.start(browser, '04-hospital-rokter-mojud-o-camp');
    const { page } = n;
    await page.goto('/bn');
    await n.title(
      'পর্ব ৪ / ৫',
      'হাসপাতাল: রক্তের মজুত, মেয়াদ ও ক্যাম্প',
      'হাসপাতাল বা ব্লাড ব্যাংকের নিজস্ব অ্যাকাউন্টে মজুত হালনাগাদ, ব্যাগ গ্রহণ ও রক্তদান ক্যাম্প',
      'চতুর্থ পর্বে দেখব, হাসপাতাল বা ব্লাড ব্যাংকের কর্মী কীভাবে নিজের প্রতিষ্ঠানের রক্তের মজুত এবং রক্তদান ক্যাম্প পরিচালনা করেন।'
    );
    await n.say('হাসপাতালের কর্মী নিজের অ্যাকাউন্টে সাইন ইন করেন। এই অ্যাকাউন্টে শুধু নিজের হাসপাতালের মজুত বদলানোর অনুমতি আছে।', async () => {
      await signInOnCamera(n, 'hospital');
    });
    await nav(n, 'হাসপাতাল ও ব্লাড ব্যাংক');
    await expect(card(page, 'O+').locator('button').nth(1)).toBeVisible({ timeout: 30_000 });
    await n.say('এটি হাসপাতাল ও ব্লাড ব্যাংক পেজ। সাইন ইন করার সাথে সাথে কর্মীর নিজের হাসপাতাল নিজে থেকেই খুলে যায়। ওপরে প্রতিষ্ঠানের নাম এবং যাচাই করা প্রতিষ্ঠানের চিহ্ন দেখা যাচ্ছে।', async () => {
      await scroll(page, 0);
    });
    await n.say('এখানে প্রতিটি রক্তের গ্রুপের মজুত আছে। কোনো গ্রুপে কম থাকলে সংকট চিহ্ন দেখায়। নিজের হাসপাতালে প্রতিটি কার্ডে বাড়ানো ও কমানোর বোতাম থাকে।', async () => {
      await scroll(page, 700);
    });
    await n.say('প্লাস চাপলে ও পজিটিভ ব্যাগ বাড়ে, মাইনাস চাপলে কমে। সব পরিবর্তন সাথে সাথে সার্ভারে সংরক্ষিত হয়।', async () => {
      await card(page, 'O+').locator('button').nth(1).click();
      await card(page, 'O+').locator('button').nth(1).click();
      await page.waitForTimeout(900);
      await card(page, 'O+').locator('button').nth(0).click();
    });
    await n.say('নির্দিষ্ট সংখ্যা সরাসরি লিখেও সেট করা যায়, যেমন এ পজিটিভ গ্রুপে বিশ ব্যাগ।', async () => {
      await card(page, 'A+').locator('input[type=number]').fill('20');
      await card(page, 'A+').locator('button', { hasText: /সংরক্ষণ/ }).click();
    });
    await n.say('নিচে রক্ত গ্রহণ ও মেয়াদ ট্র্যাকিং। নতুন রক্ত এলে গ্রুপ, ব্যাগের সংখ্যা ও মেয়াদের তারিখ দিয়ে গ্রহণ করা হয়। মেয়াদ শেষ হলে ব্যাচ বাতিল করলে মজুত থেকে সেই ব্যাগ কমে যায়।', async () => {
      await scroll(page, 1100);
      const panel = page.locator('div.rounded-3xl', { has: page.getByRole('heading', { name: /রক্ত গ্রহণ/ }) });
      await panel.locator('select').selectOption('O-');
      await panel.locator('input[type=number]').fill('5');
      await panel.locator('input[type=date]').fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
      await panel.getByRole('button', { name: /ব্যাগ গ্রহণ/ }).click();
      await page.waitForTimeout(1500);
    });
    await scroll(page, 0);
    await n.say('এরপর ক্লিনিক্যাল রিকুইজিশন ট্যাব। হাসপাতাল এখান থেকে রোগীর জন্য রক্তের রিকুইজিশন তৈরি করে, এবং মজুত থেকে তা পূরণ করা যায়।', async () => {
      await page.getByRole('button', { name: 'ক্লিনিক্যাল রিকুইজিশন জারি' }).click();
      await page.waitForTimeout(1200);
      await scroll(page, 400);
    });
    await scroll(page, 0);
    await n.say('এবার রক্তদান ক্যাম্প ও ড্রাইভ ট্যাব। এখানে হাসপাতাল বা সংস্থা নতুন ক্যাম্প নির্ধারণ করে। ক্যাম্প শিডিউল করুন বোতামে চাপি।', async () => {
      await page.getByRole('button', { name: 'রক্তদান ক্যাম্প ও ড্রাইভ' }).click();
      await page.locator('button', { has: page.locator('span.material-symbols-outlined', { hasText: 'add_box' }) }).click();
    });
    await n.say('ক্যাম্পের নাম, স্থান ও তারিখ দিয়ে প্রকাশ করলেই এটি সবার জন্য ক্যাম্পের তালিকায় চলে আসে এবং রক্তদাতারা সেখানে নিবন্ধন করতে পারেন।', async () => {
      const modal = page.locator('div.fixed.inset-0');
      await modal.locator('input[type=text]').nth(0).fill('বিনামূল্যে রক্তদান ক্যাম্প');
      await modal.locator('input[type=text]').nth(1).fill('সিটি জেনারেল হাসপাতাল, ধানমন্ডি');
      await modal.locator('input[type=date]').fill(new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10));
      await modal.locator('button[type=submit]').click();
      await expect(page.getByText('বিনামূল্যে রক্তদান ক্যাম্প').first()).toBeVisible({ timeout: 20_000 });
    });
    await n.say('জরুরি ডোনার তলব ও ম্যাপ ট্যাবে হাসপাতাল কাছের রক্তদাতা খুঁজতে এবং কাছের প্রতিষ্ঠান মানচিত্রে দেখতে পারে।', async () => {
      await page.getByRole('button', { name: 'জরুরি ডোনার তলব' }).click();
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: 'ম্যাপ' }).click();
      await page.waitForTimeout(2000);
    });
    await n.say('একটি গুরুত্বপূর্ণ নিরাপত্তার নিয়ম: হাসপাতালের অ্যাকাউন্ট শুধু নিজের হাসপাতালের মজুত বদলাতে পারে। অন্য হাসপাতালের মজুত বদলানোর চেষ্টা করলে সার্ভার সেটি নিজে থেকেই বাতিল করে দেয়, স্ক্রিনে বোতাম থাকুক বা না থাকুক।', async () => {
      await page.waitForTimeout(500);
    });
    await n.say('নতুন কোনো হাসপাতাল বা ব্লাড ব্যাংক যুক্ত হতে চাইলে এই পেজের নিচের আবেদন ফর্ম পূরণ করে আবেদন করতে পারে। সাইন ইন লাগে না। অ্যাডমিন যাচাই করে অনুমোদন দিলে প্রতিষ্ঠানটি তালিকায় আসে।', async () => {
      await scroll(page, 5000);
    });
    await n.say('চতুর্থ পর্ব এখানে শেষ। শেষ পর্বে দেখব, অ্যাডমিন কীভাবে পুরো ব্যবস্থা নিয়ন্ত্রণ করেন।');
    console.log('VIDEO', await n.finish());
  });

  test('পর্ব ৫: অ্যাডমিন প্যানেল ও অপস কমান্ড', async ({ browser }) => {
    const n = await Narrator.start(browser, '05-admin-panel-o-ops-command');
    const { page } = n;
    await page.goto('/bn');
    await n.title(
      'পর্ব ৫ / ৫',
      'অ্যাডমিন: প্যানেল, অ্যাক্সেস ও অপস কমান্ড',
      'পুরো ব্যবস্থার নজরদারি, প্রতিষ্ঠান অনুমোদন, ভূমিকা ও অনুমতি নিয়ন্ত্রণ',
      'শেষ পর্বে দেখব, অ্যাডমিন কীভাবে পুরো ব্যবস্থা এক জায়গা থেকে দেখেন ও নিয়ন্ত্রণ করেন।'
    );
    await n.say('অ্যাডমিন নিজের অ্যাকাউন্টে সাইন ইন করেন। অ্যাডমিন পেজ সবার জন্য খোলা নয়। সার্ভার প্রতিবার অনুমতি যাচাই করে, তাই সাধারণ ব্যবহারকারী লিংক জানলেও ঢুকতে পারেন না।', async () => {
      await signInOnCamera(n, 'admin');
      await page.goto('/bn/admin');
      await page.waitForTimeout(2500);
    });
    await n.say('এটি ড্যাশবোর্ড ওভারভিউ। সক্রিয় ডোনার, জরুরি পেন্ডিং অনুরোধ, অনুমোদিত প্রতিষ্ঠান এবং মোট নিবন্ধিত রক্তদাতার সংখ্যা এক নজরে দেখা যায়।', async () => {
      await scroll(page, 300);
    });
    const side = async (label: string, say: string) => {
      await n.say(say, async () => {
        await scroll(page, 0);
        await page.getByText(label, { exact: true }).first().click();
        await page.waitForTimeout(1800);
        await scroll(page, 350);
      });
    };
    await side('জরুরি সতর্কতা ও ব্যাসার্ধ', 'জরুরি সতর্কতা ও ব্যাসার্ধ ট্যাব থেকে অ্যাডমিন জরুরি সতর্কবার্তা এবং কত কিলোমিটারের মধ্যে ডোনারদের জানানো হবে তা নিয়ন্ত্রণ করেন।');
    await side('ডোনার রেজিস্ট্রি', 'ডোনার রেজিস্ট্রিতে সব নিবন্ধিত রক্তদাতাকে দেখা, খোঁজা ও পরিচালনা করা যায়।');
    await side('রক্তের রিকোয়েস্ট', 'রক্তের রিকোয়েস্ট ট্যাবে সব অনুরোধ, তাদের অবস্থা ও জরুরি পরিস্থিতি একসাথে দেখা যায়।');
    await side('হাসপাতাল ও সংস্থা', 'হাসপাতাল ও সংস্থা ট্যাবে নতুন প্রতিষ্ঠানের আবেদন আসে। অ্যাডমিন যাচাই করে অনুমোদন বা বাতিল করেন, আর অনুমোদনের সময় সেই প্রতিষ্ঠানের কর্মীকে হাসপাতাল ভূমিকা দেওয়া যায়।');
    await side('সিস্টেম অডিট', 'সিস্টেম অডিট ট্যাবে কে কখন কী পরিবর্তন করেছেন তার লগ থাকে, ফলে সবকিছু জবাবদিহির মধ্যে থাকে।');
    await side('অ্যাক্সেস ও রোল', 'অ্যাক্সেস ও রোল ট্যাবে অ্যাডমিন নতুন ভূমিকা বানাতে পারেন, প্রতিটি ভূমিকায় কোন কোন কাজের অনুমতি থাকবে তা টিক দিয়ে ঠিক করেন, এবং কোনো ব্যবহারকারীকে সেই ভূমিকা দেন। এই অনুমতি লগইন টোকেনে থাকে এবং শুধু সার্ভার থেকে বদলানো যায়।');
    await n.say('এবার অপস কমান্ড পেজ। এটি অ্যাডমিনের জন্য আলাদা নিয়ন্ত্রণ কেন্দ্র।', async () => {
      await page.goto('/bn/command');
      await page.waitForTimeout(2500);
    });
    await n.say('এখানে জরুরি অনুরোধের কিউ, হাসপাতালের মজুত ও কোল্ড চেইন এবং প্রতারণা শনাক্তকরণ দেখা যায়। কিছু অংশ যেমন তাপমাত্রা সেন্সর নমুনা তথ্য, কারণ এর জন্য আসল সেন্সর যুক্ত নেই।', async () => {
      await scroll(page, 400);
    });
    await n.say('সবকিছু মিলিয়ে ব্লাড লাগবে একটি পূর্ণাঙ্গ ব্যবস্থা। রক্তগ্রহীতা অনুরোধ করেন, ডোনার সাড়া দেন, হাসপাতাল মজুত চালায়, আর অ্যাডমিন সব দেখে ও নিয়ন্ত্রণ করে। প্রযুক্তি হিসেবে নেক্সট জে এস, টাইপস্ক্রিপ্ট, সুপাবেস ও প্রিজমা ব্যবহার করা হয়েছে, এবং প্রতিটি নিরাপত্তা যাচাই সার্ভারে হয়।', async () => {
      await scroll(page, 0);
    });
    await n.say('ভিডিও সিরিজ এখানে শেষ। ধন্যবাদ।');
    console.log('VIDEO', await n.finish());
  });

  test('পর্ব ১: পরিচিতি, জরুরি হাব ও ডোনার খোঁজা', async ({ browser }) => {
    const n = await Narrator.start(browser, '01-porichiti-jaruri-hub-o-donor-khoja');
    const { page } = n;
    await page.goto('/bn');
    await n.title(
      'পর্ব ১ / ৫',
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
