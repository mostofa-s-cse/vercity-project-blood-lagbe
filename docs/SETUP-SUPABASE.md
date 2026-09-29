# Setting up Supabase, Prisma and Google sign-in

The app already contains all the code. What is missing is **your own accounts and keys**, which only you can create. This guide takes about 20 minutes.

The app runs without any of this (as a demo with sample data). Each group of settings in `.env.local` switches one feature on:

| You set | You get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A "Sign in with Google" button in the header |
| `DATABASE_URL` + `DIRECT_URL` | New donors and SOS requests are saved to your database |
| `NEXT_PUBLIC_ADMIN_OPEN="true"` | Opens the Admin Panel and Ops Command to everyone, for local demos only (see step 8) |

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

## 8. Choose who is an admin

Only **admin accounts** can open the Admin Panel (`/bn/admin`) and Ops Command (`/bn/command`); the header and footer hide their links from everyone else. The role is stored in the person's Supabase **`app_metadata`** (`{"role": "admin"}`). Unlike a normal profile field, `app_metadata` cannot be edited by the person themselves, only with SQL or the service key, so nobody can make themselves an admin.

1. Sign in once with the Google account that should be the first admin, so Supabase creates the user.
2. Supabase dashboard > **SQL Editor**, run (with that account's email):

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
   where email = 'you@example.com';
   ```

3. **Sign out and sign in again** in the app. The role travels inside the login token, which is only renewed at sign-in (and about hourly), so the old token does not have it yet.
4. To remove an admin, run the same statement with `raw_app_meta_data - 'role'`.

Who can open what:

| Page | Who |
|---|---|
| Emergency Hub, Donor Directory, Create SOS, Register, Track Requests, Live Tracker, Hospitals, Pitch Deck, User Guide | Everyone. Nobody should need an account in an emergency. |
| Donor Passport | Everyone in demo mode; **signed-in people only** once Supabase is set up. |
| Admin Panel, Ops Command | **Admins only.** Without Supabase they are closed to everyone. |

**Demo without Supabase:** set `NEXT_PUBLIC_ADMIN_OPEN="true"` in `.env.local` to open the admin area to everyone on your machine. It is read when the app is built, so restart `npm run dev` (or rebuild) after changing it. **Never set it in production.**

The check runs on the server (`src/proxy.ts`), before the page is sent, so typing the URL does not get around it. Someone without access is sent to a "no access" page that offers sign-in (or sign-out, if they are signed in with a non-admin account).

## How it works

- **Sign-in**: the button starts Google sign-in through Supabase. Google sends the person to Supabase, and Supabase sends them to `/auth/callback` on this app. That route swaps the one-time code for a session cookie, saves the person in `profiles`, and returns them to the page they came from (`src/app/auth/callback/route.ts`).
- **Staying signed in and access control**: `src/proxy.ts` refreshes the session cookie on page requests and decides who may open the admin and signed-in pages (rules in `src/lib/roles.ts`).
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
| The admin link never appears after I made myself admin | You must sign out and sign in again (step 8.3). Check that the SQL matched a row: the email must be exactly the Google account's email. |
| Saving a donor does nothing | The API answers `503` when `DATABASE_URL` is not set. Set it and restart. Errors are logged in the terminal running `npm run dev`. |
