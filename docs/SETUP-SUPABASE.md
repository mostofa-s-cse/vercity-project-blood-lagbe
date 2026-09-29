# Setting up Supabase, Prisma and Google sign-in

The app already contains all the code. What is missing is **your own accounts and keys**, which only you can create. This guide takes about 20 minutes.

The app runs without any of this (as a demo with sample data). Each group of settings in `.env.local` switches one feature on:

| You set | You get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A "Sign in with Google" button in the header |
| `DATABASE_URL` + `DIRECT_URL` | New donors and SOS requests are saved to your database |
| `SUPABASE_SERVICE_ROLE_KEY` (+ the database) and `ADMIN_EMAILS` | The Admin Panel can give people the **admin** or **hospital** role by email (step 8) |
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

The publishable key is designed to be public. The `service_role` (secret) key is a different thing: it is needed only for handing out roles (step 8), goes in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`, and must **never** be given a `NEXT_PUBLIC_` name, committed, or put anywhere the browser can reach, because it bypasses all security.

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

## 8. Choose who is an admin or a hospital account

There are three kinds of people:

| Role | Who | Can |
|---|---|---|
| (none) | Everyone, signed in or not | Use every public screen: SOS, donors, tracking, hospitals (view), guide |
| `hospital` | Staff of one hospital | Everything above, plus change **their own hospital's** blood stock and create donation camps |
| `admin` | You and your team | Everything: Admin Panel, Ops Command, every hospital's stock, and giving roles to others |

A role is stored in the person's Supabase **`app_metadata`** (`{"role": "hospital", "hospital_id": "ORG-01"}`). Unlike a normal profile field, `app_metadata` cannot be edited by the person themselves, only by the server with the service key, so nobody can make themselves an admin. The server checks it on every request, so hiding a button is never the protection.

### The first admin

Set your own email in `.env.local`, plus the service key and database from steps 3 and 2:

```
SUPABASE_SERVICE_ROLE_KEY="..."
ADMIN_EMAILS="you@example.com"
```

Restart, then sign in with that Google account. You become an admin at first sign-in and the **Admin Panel** link appears in the header. `ADMIN_EMAILS` always wins, so you cannot lock yourself out by editing roles.

If you would rather not use the service key for the first admin, run this SQL once in the Supabase **SQL Editor** and sign out and in again:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'you@example.com';
```

### Everyone else: Admin Panel > Access

Open the **Admin Panel**, then the **Access** tab. Type the person's Google email, choose **Hospital** (and which hospital) or **Admin**, and press the button.

- If the person has signed in before, the role is applied at once (**Active**). They must **sign out and sign in again** for their login to pick it up.
- If they have never signed in, the grant waits (**Waiting for first sign-in**) and is applied automatically the first time they sign in with that email.
- **Revoke** removes the role. You cannot revoke your own.
- Only verified Google emails receive roles.

### Who can open what

| Page | Who |
|---|---|
| Emergency Hub, Donor Directory, Create SOS, Register, Track Requests, Live Tracker, Hospitals (view), Pitch Deck, User Guide | Everyone. Nobody should need an account in an emergency. |
| Hospital blood stock and donation camps (change) | The `hospital` account of that hospital, and admins. Everyone else: view only. |
| Donor Passport | Everyone in demo mode; **signed-in people only** once Supabase is set up. |
| Admin Panel, Ops Command | **Admins only.** Without Supabase they are closed to everyone. |

The admin and signed-in pages are checked on the server before the page is sent (`src/proxy.ts`), and stock changes are checked in the API (`src/app/api/hospitals/[id]/stock/route.ts`).

**Demo without Supabase:** set `NEXT_PUBLIC_ADMIN_OPEN="true"` in `.env.local` to open the admin pages to everyone on your machine (role management still needs real sign-in). It is read when the app is built, so restart `npm run dev` after changing it. **Never set it in production.**

## How it works

- **Sign-in**: the button starts Google sign-in through Supabase. Google sends the person to Supabase, and Supabase sends them to `/auth/callback` on this app. That route swaps the one-time code for a session cookie, saves the person in `profiles`, and returns them to the page they came from (`src/app/auth/callback/route.ts`).
- **Staying signed in and access control**: `src/proxy.ts` refreshes the session cookie on page requests and decides who may open the admin and signed-in pages (rules in `src/lib/roles.ts`).
- **Roles**: the Access tab calls `/api/admin/roles`. `src/lib/grantService.ts` holds the rules; the role is copied into the person's `app_metadata` with the service key (`src/lib/supabase/admin.ts`, marked `server-only`) and read back from the login token by `src/lib/roles.ts`.
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
| The admin link never appears after I made myself admin | With `ADMIN_EMAILS`: the email must exactly match the Google account, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` must be set, and you must sign in again after restarting. With the SQL: sign out and in again, and check that the SQL matched a row. |
| The Access tab says the service key is missing | Set `SUPABASE_SERVICE_ROLE_KEY` (server only) in `.env.local` and restart. |
| I gave someone the hospital role but they still cannot change stock | They must sign out and sign in again so their login carries the role. Check the email is exactly their Google email. |
| A hospital account can see the buttons but saving fails | The API answers `403` if the account's hospital is not the one being edited, `401` if the login expired, and `503` without a database. |
| Saving a donor does nothing | The API answers `503` when `DATABASE_URL` is not set. Set it and restart. Errors are logged in the terminal running `npm run dev`. |
