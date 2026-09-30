# Setting up Supabase, Prisma and Google sign-in

The app already contains all the code. What is missing is **your own accounts and keys**, which only you can create. This guide takes about 20 minutes.

The app runs without any of this (as a demo with sample data). Each group of settings in `.env.local` switches one feature on:

| You set | You get |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A "Sign in with Google" button in the header |
| `DATABASE_URL` + `DIRECT_URL` | New donors and SOS requests are saved to your database |
| `SUPABASE_SERVICE_ROLE_KEY` (+ the database) and `ADMIN_EMAILS` | You can create roles in the Admin Panel and give them to people by email (step 8) |
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

## 8. Roles: who can do what

Access is controlled by **roles that you create yourself**. A role is a name plus a choice of permissions; you give a role to a person by their Google email.

### Permissions

The list of permissions is fixed in the code (`src/lib/permissions.ts`), because each one is enforced by code somewhere. You choose which of them each role has.

| Permission | Lets the person |
|---|---|
| `panel.open` | Open the Admin Panel and its overview (needed for every other panel permission, ticked for you automatically) |
| `panel.alerts`, `panel.donors`, `panel.requests`, `panel.hospitals`, `panel.fraud`, `panel.logs` | Use that tab of the Admin Panel |
| `roles.manage` | Open the **Access** tab: create roles, edit them, give them to people |
| `ops.command` | Open Ops Command |
| `stock.own` | Change the blood stock of **one hospital** they are tied to |
| `stock.all` | Change the blood stock of **every** hospital |
| `camps.create` | Create donation camps |

Everyone else, signed in or not, can use every other screen: SOS, donors, tracking, hospitals (view only), the guide. **Nobody needs an account in an emergency.** The Donor Passport needs sign-in once Supabase is set up.

### Roles that already exist

The database migration creates these (you can edit or delete everything except the two built-in roles):

| Role | Permissions |
|---|---|
| **Admin** (built-in, locked) | Everything |
| **Hospital staff** (built-in) | `stock.own`, `camps.create`. Tied to one hospital when given. |
| Panel viewer | `panel.open` |
| Alert operator | `panel.open`, `panel.alerts` |
| Donor coordinator | `panel.open`, `panel.donors`, `panel.requests` |
| Fraud reviewer | `panel.open`, `panel.fraud`, `panel.logs` |
| Blood bank manager | `stock.all`, `camps.create` |

### The first admin

Set your own email in `.env.local`, plus the service key and the database from steps 2 and 3:

```
SUPABASE_SERVICE_ROLE_KEY="..."
ADMIN_EMAILS="you@example.com"
```

Restart, run `npm run db:migrate`, then sign in with that Google account. You get the **Admin** role at first sign-in and the **Admin Panel** link appears in the header. `ADMIN_EMAILS` always wins, so you cannot lock yourself out by editing roles.

If you would rather not use `ADMIN_EMAILS`, run this once in the Supabase **SQL Editor** and sign out and in again:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'you@example.com';
```

### Managing roles: Admin Panel > Access

- **Roles**: create a role (name, description, tick permissions), edit it or delete it. Editing a role updates everyone who already has it. A role somebody still has cannot be deleted.
- **People**: type a Google email, pick a role from the list, and, for a role that only manages its own hospital, pick the hospital. Then **Revoke** removes it later. You cannot revoke your own role.
- If the person has signed in before, the role is saved at once (**Active**), but they must **sign out and sign in again** for their login to carry it. Edits to a role reach people the same way: at their next sign-in or when their login renews (about hourly).
- If they have never signed in, it waits (**Waiting for first sign-in**) and is applied at their first sign-in with that email.
- Only verified Google emails receive roles. One role per email: giving a new role replaces the old one.

### How it is stored and checked

A role's permissions are copied into the person's Supabase **`app_metadata`** (`permissions`, `role_name`, `hospital_id`). Unlike a normal profile field, `app_metadata` cannot be edited by the person, only by the server with the service key, so nobody can give themselves a role. The permissions travel in the login token, so checks are fast and need no database lookup. Every check runs on the **server**: the admin pages are stopped by `src/proxy.ts` before the page is sent, and the APIs check the token themselves (for example `src/app/api/hospitals/[id]/stock/route.ts`), so hiding a button is never the protection.

**Demo without Supabase:** set `NEXT_PUBLIC_ADMIN_OPEN="true"` in `.env.local` to open the admin pages to everyone on your machine (managing roles still needs a real sign-in). It is read when the app is built, so restart `npm run dev` after changing it. **Never set it in production.**

## How it works

- **Sign-in**: the button starts Google sign-in through Supabase. Google sends the person to Supabase, and Supabase sends them to `/auth/callback` on this app. That route swaps the one-time code for a session cookie, saves the person in `profiles`, and returns them to the page they came from (`src/app/auth/callback/route.ts`).
- **Staying signed in and access control**: `src/proxy.ts` refreshes the session cookie on page requests and decides who may open the admin and signed-in pages (rules in `src/lib/roles.ts`).
- **Roles**: the Access tab calls `/api/admin/roles` (role definitions) and `/api/admin/grants` (who has which role). `src/lib/grantService.ts` holds the rules; a role's permissions are copied into the person's `app_metadata` with the service key (`src/lib/supabase/admin.ts`, marked `server-only`) and read back from the login token by `src/lib/roles.ts`.
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
| I gave someone a role but it has no effect | They must sign out and sign in again so their login carries it. Check the email is exactly their Google email, and that the role has the permission you expect (Access tab). For a role tied to one hospital, check the hospital you picked. |
| I edited a role but people do not see the change | Their login only picks it up at their next sign-in or when it renews (about hourly). The Access tab tells you how many people were updated; if some failed, edit the role again. |
| A hospital account can see the buttons but saving fails | The API answers `403` if the account's hospital is not the one being edited, `401` if the login expired, and `503` without a database. |
| Saving a donor does nothing | The API answers `503` when `DATABASE_URL` is not set. Set it and restart. Errors are logged in the terminal running `npm run dev`. |
