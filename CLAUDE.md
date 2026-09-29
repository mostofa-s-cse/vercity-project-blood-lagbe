# Blood Lagbe? (রক্ত লাগবে?)

Blood donation and blood request platform for Bangladesh: donors, blood seekers, hospitals/organizations and admins on one site. English and Bengali.

**Start here in a new session:** read `docs/HANDOFF.md` (where the work stands, how to resume, progress log), then the current plan it points to. The long-range roadmap is `docs/SPEC-MATCH-PLAN.md`.

## Stack
Next.js 16 (App Router, Turbopack), React 19, TypeScript (non-strict), Tailwind 4, Supabase (Auth + Postgres), Prisma 7, Redux Toolkit / RTK Query (being adopted, see M1), Node 22.18+.

## Commands
- `npm run dev` / `npm run build` / `npm run lint` (`tsc --noEmit`) / `npm test` (`node --test`, no test framework)
- `npm run db:migrate` (apply migrations), `db:generate`, `db:studio`; `prisma generate` also runs on `npm install` and before `build`
- Setup of Supabase, Google sign-in, roles: `docs/SETUP-SUPABASE.md`. The app must keep running with **no environment variables** (demo mode).

## Layout
- `src/app/[lang]/...` pages (`/bn/...`, `/en/...`; `src/proxy.ts` redirects prefix-less URLs and enforces page access); `src/app/api/...` route handlers; `src/app/auth/callback` Google return.
- `src/components/*Screen.tsx` one component per screen; the `page.tsx` files are thin wrappers.
- `src/lib/` server and shared logic. **Pure rules live here with tests** (`permissions`, `roles`, `validation`, `grantService`, ...). Prisma-backed pieces are thin (`grantStore.ts`).
- `src/locales/{en,bn}/<namespace>.ts`: every visible string. `en` defines the shape, `bn` must match (a test enforces identical keys). Components use `const { t } = useLanguage()` and `t.<ns>.<key>`. User guide text is under `docs/` namespaces (`src/locales/*/docs/`).
- `prisma/schema.prisma`, `prisma/migrations/*` (SQL is committed; some migrations are hand-written, e.g. `0004`).
- `src/data/mockData.ts`: sample data. M1 replaces its live uses with database reads.

## Conventions
- **Test first for logic**: write the failing `*.test.ts`, watch it fail, implement. Tests import with the `.ts` extension (`./x.ts`) and pure modules must not import React or the alias `@/`. Add new test files to the `test` script in `package.json`.
- Non-strict TypeScript does not narrow `{ ok: true } | { ok: false }` unions; results use `{ value, error }`.
- Every check is enforced **on the server** (`src/proxy.ts`, API routes). UI hiding is only convenience.
- Secrets: `SUPABASE_SERVICE_ROLE_KEY` is server-only (`import 'server-only'`), never `NEXT_PUBLIC_`. No real keys in the repo.
- Emergencies must never need an account: creating an SOS and searching donors stay open to signed-out people.
- Bengali strings: natural Bengali, keep acronyms (SOS, OTP, ICU) and blood groups.
- Route files may only export HTTP methods and route config; put helpers in `src/lib`.

## Definition of done for a task
`npm run lint` clean, `npm test` green, `npm run build` passes, the change checked in a browser (for UI) or against a real Postgres (for database code), committed, and `docs/HANDOFF.md` progress log plus the plan's checkboxes updated.

## Testing against a real database
Start a throwaway Postgres, apply the migrations, point `DATABASE_URL`/`DIRECT_URL` at it, and remove it afterwards. Details in `docs/HANDOFF.md`. Sign-in cannot be faked without a real Supabase project, so server permission logic is unit-tested against fakes, and UI is checked by serving stand-in API responses.
