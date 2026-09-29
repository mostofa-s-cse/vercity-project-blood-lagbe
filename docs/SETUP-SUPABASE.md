# Setting up Supabase, Prisma and Google sign-in

The app already contains all the code. What is missing is **your own accounts and keys**, which only you can create. This guide takes about 20 minutes.

The app runs without any of this (as a demo with sample data). Each group of settings in `.env.local` switches one feature on:

| You set | You get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A "Sign in with Google" button in the header |
| `DATABASE_URL` + `DIRECT_URL` | New donors and SOS requests are saved to your database |

Sign-in uses **Supabase Auth with its built-in Google provider**. Auth0 is not used and is not needed.

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in, and create a **new project**.
2. Choose a region close to your users (for Bangladesh, Singapore is usually the nearest).
3. Set a **database password** and keep it somewhere safe. If it contains special characters such as `@`, `#` or `/`, you must URL-encode them when you paste it into the connection strings in step 3.

## 2. Copy the project URL and key

Supabase dashboard > **Project Settings > API**.

Create `.env.local` in the project root (copy `.env.example`) and set:

```
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="the publishable key (older projects call it the anon key)"
```

The publishable key is designed to be public. **Do not** put the `service_role` / secret key anywhere in this app: it is not needed, and it would bypass all security.

## 3. Copy the database connection strings

Supabase dashboard > **Connect** (button at the top) > **ORMs** > **Prisma**. It shows two URLs. Put them in `.env.local`:

```
DATABASE_URL="postgresql://postgres.YOUR-PROJECT-REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.YOUR-PROJECT-REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

- `DATABASE_URL` (port **6543**, transaction pooler) is used by the running app.
- `DIRECT_URL` (port **5432**) is used only for migrations.
- Replace `[YOUR-PASSWORD]` with your real database password (URL-encoded).

## 4. Create the tables

```bash
npm install          # also runs `prisma generate`
npm run db:migrate   # applies prisma/migrations to your database
```

This creates three tables (`profiles`, `donors`, `sos_requests`) and turns on **row-level security** with no policies. That means the browser key can read and write nothing in those tables; only the server (through Prisma) can. Check it in the dashboard under **Table Editor**: each table should show the RLS badge.

## 5. Create the Google sign-in credentials

1. Go to <https://console.cloud.google.com> and create (or pick) a project.
2. **APIs & Services > OAuth consent screen**: choose **External**, fill in the app name and your support email, and save.
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000` and your production site URL.
   - **Authorized redirect URIs**: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`. This is Supabase's address, not your app's. You can copy it from Supabase (next step).
4. Copy the **Client ID** and **Client secret**.

## 6. Turn Google on in Supabase

1. Supabase dashboard > **Authentication > Sign In / Providers > Google**: enable it and paste the Client ID and Client secret. Save.
2. **Authentication > URL Configuration**:
   - **Site URL**: your production URL (for local work, `http://localhost:3000`).
   - **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`.

## 7. Run it

```bash
npm run dev
```

Open <http://localhost:3000>. The header now shows **Sign in with Google**. After you sign in you see your photo and a sign-out button, and a row for you appears in the `profiles` table.

To check the database: register a donor or post an SOS request, then look in **Table Editor > donors / sos_requests**.

## How it works

- **Sign-in**: the button starts Google sign-in through Supabase. Google sends the person to Supabase, and Supabase sends them to `/auth/callback` on this app. That route swaps the one-time code for a session cookie, saves the person in `profiles`, and returns them to the page they came from (`src/app/auth/callback/route.ts`).
- **Staying signed in**: `src/proxy.ts` refreshes the session cookie on page requests.
- **Saving data**: the donor and SOS forms POST to `/api/donors` and `/api/sos`. Both work **signed out** (someone in an emergency should not have to sign in); when signed in, the record is linked to the person's profile.
- **The screens still read sample data.** Saving works, but lists such as the donor directory and request tracking still come from `src/data/mockData.ts`. Reading them from the database is the next step.

## Before going live

- **Add rate limiting** to `/api/donors` and `/api/sos`. They accept anonymous requests and validate input, but nothing stops one person from posting many. A CAPTCHA or a limiter such as Upstash Ratelimit works well.
- Set the same environment variables in your hosting provider (for example Vercel). Never commit `.env.local` (it is git-ignored).
- The `proxy.ts` redirect (`/donors` to `/bn/donors`) needs a server. It will not work on a static-only host.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No Sign in button | `NEXT_PUBLIC_SUPABASE_URL` or the publishable key is missing or misspelled. Restart `npm run dev` after editing `.env.local`. |
| Google says `redirect_uri_mismatch` | The **Authorized redirect URI** in Google Cloud is not exactly `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`. |
| After signing in you land on the home page with `?auth_error=1` | The Redirect URL is not allowed in Supabase (step 6.2), or the Google Client ID / secret is wrong. |
| `prisma migrate` fails with `P1000` or `P1001` | Wrong password or URL, an un-encoded special character in the password, or the direct host is not reachable from your network (use the pooler host as in step 3). |
| Saving a donor does nothing | The API answers `503` when `DATABASE_URL` is not set. Set it and restart. Errors are logged in the terminal running `npm run dev`. |
