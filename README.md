# Blood Lagbe? (রক্ত লাগবে?)

A blood donation and blood request platform for Bangladesh. Donors, blood seekers, hospitals/organizations
and admins on one site, in English and Bengali. Emergencies (posting an SOS, searching for donors) never
require an account.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript (non-strict), Tailwind 4, Supabase (Auth +
Postgres), Prisma 7, Redux Toolkit / RTK Query, Node 22.18+.

## Layout

```
src/app/[lang]/...   pages, under /bn/... and /en/...; src/proxy.ts redirects prefix-less URLs
                     and enforces page access on the server
src/app/api/...      route handlers (the actual permission/validation boundary — see Conventions)
src/components/      one *Screen.tsx component per screen; app/ page.tsx files are thin wrappers
src/lib/             server and shared logic; pure rules (permissions, roles, validation, matching,
                     geo, ...) live here with tests; Prisma-backed pieces are thin wrappers over them
src/locales/{en,bn}/ every visible string, one namespace per file; en defines the shape, bn must match
src/data/            sample/mock data used only when no database is configured (demo mode)
prisma/              schema.prisma, migrations/ (SQL is committed), seed.ts
docs/                project history, setup guides, and the spec-match roadmap (see below)
e2e/                 Playwright end-to-end specs
```

## Running locally

Demo mode needs **zero environment variables** — every screen falls back to sample data and every
mutating API responds `503` instead of crashing:

```sh
npm install
npm run dev
```

To run against a real database instead (required for anything that writes data — donor registration, SOS
requests, admin actions):

1. Point `DATABASE_URL` (and optionally `DIRECT_URL`, used for migrations against a pooled connection —
   falls back to `DATABASE_URL` if unset) at a Postgres instance.
2. `npm run db:migrate` to apply the committed migrations.
3. `npm run db:seed` to load realistic sample data (donors, SOS requests, organizations, hospital stock,
   fraud incidents) — safe to re-run, it upserts by fixed id rather than inserting duplicates.
4. For a throwaway local Postgres instead of a hosted one, see the `.dev-db/` setup documented in
   `docs/HANDOFF.md`.
5. For real Supabase Auth (Google sign-in, email/password, roles) see `docs/SETUP-SUPABASE.md`.

## Testing

```sh
npm run lint          # tsc --noEmit
npm test              # node --test, pure-logic unit tests
npm run test:e2e:demo # Playwright, no database needed
npm run test:e2e:real # Playwright, needs DATABASE_URL/DIRECT_URL pointed at a migrated+seeded Postgres
npm run build         # production build
```

CI (`.github/workflows/ci.yml`) runs all of the above against a real Postgres service container on every
push and pull request.

## Environment variables

Everything below is optional — every feature it gates degrades to an honest no-op or demo-mode fallback
when unset, never a crash.

| Variable | Purpose | Demo-mode-safe when unset? |
|---|---|---|
| `DATABASE_URL` | Postgres connection string (Prisma) | Yes — app runs in demo mode (sample data, `503` on writes) |
| `DIRECT_URL` | Unpooled Postgres connection, used for migrations; falls back to `DATABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes — Google/email sign-in just isn't offered |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (client-side auth) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase admin API access (role/grant management); never exposed to the client | Yes — admin role management needs a real session anyway |
| `ADMIN_EMAILS` | Comma-separated emails always granted admin, independent of the `Access` tab | Yes — no bootstrap admins |
| `NEXT_PUBLIC_ADMIN_OPEN` | Opens the Admin Panel/Ops Command *pages* without a permission check, for local development | Yes — pages are simply hidden/redirected |
| `RESEND_API_KEY` | Enables real outgoing email for donor-match notifications | Yes — matches still show up in-app, nothing is emailed |
| `SMS_GATEWAY_API_KEY` | Enables real outgoing SMS for donor-match notifications | Yes — matches still show up in-app, nothing is texted |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Enables Cloudflare Turnstile CAPTCHA on public forms (donor registration, SOS, org apply, respond) | Yes — CAPTCHA widget simply doesn't render, no verification is required |

## More documentation

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — where the work stands, how to resume a session, the progress log.
- [`docs/SPEC-MATCH-PLAN.md`](docs/SPEC-MATCH-PLAN.md) — the long-range roadmap and how closely the
  codebase matches the original spec, work package by work package.
- [`docs/SETUP-SUPABASE.md`](docs/SETUP-SUPABASE.md) — setting up Supabase, Google sign-in, and roles.
- [`docs/EVALUATION.md`](docs/EVALUATION.md) — final self-assessment against the original spec.
- [`CLAUDE.md`](CLAUDE.md) — conventions for this codebase (written for an AI coding assistant, but
  equally useful as a terse contributor guide).
