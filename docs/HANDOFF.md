# Handoff: where the project stands and how to resume

Read this first when you pick the project up in a new session. Keep it current: append to the **Progress log** at the end of every working session.

## What the project is for
The owner's spec ("Blood Donation & Blood Request Management System") asks for: donor registry, smart donor search, blood request management, emergency requests, donor notifications, donation history, request tracking, hospital/organization management, admin dashboard; on Next.js, TypeScript, Tailwind, Redux Toolkit, REST API, Supabase (PostgreSQL), Prisma; with authentication, role-based access, protected APIs and validation; roles Donor, Blood Seeker, Hospital/Organization, Admin. Gap analysis and roadmap: `docs/SPEC-MATCH-PLAN.md`.

## Where the work stands

Realistic match to the spec: **~65%** after M1 (was ~45% at the start).

Already built (all on the branch chain below):
- Next.js migration from Vite; English/Bengali locale files; language in the URL (`/bn`, `/en`); user guide page.
- Simple SOS request (Facebook-style post with share buttons) and short donor registration.
- Supabase Google sign-in; Prisma schema and migrations `0001` to `0005`; row-level security on every table.
- Dynamic roles and permissions (`src/lib/permissions.ts`, `roles.ts`, `grantService.ts`), Admin Panel **Access** tab, hospital-scoped stock editing with server checks.
- Redux Toolkit / RTK Query as the client data layer; donors and requests are **saved and read back** from the database (Donor Directory, Emergency Hub, Request Tracking), with a real request lifecycle (`PENDING`/`DONOR_FOUND`/`COMPLETED`/`CANCELLED`), manage tokens for signed-out requesters, and donor responses. Every API falls back to `503` and every screen falls back to sample data with no database (demo mode). M1 is done.

## Milestones (from `docs/SPEC-MATCH-PLAN.md`)

| Milestone | Packages | Status |
|---|---|---|
| **M1: real data and lifecycle** | WP9 Redux Toolkit + API layer, WP1 real data, WP2 request lifecycle | **Done**, plan: `docs/superpowers/plans/2026-09-29-m1-real-data.md` |
| M2: donors and notifications | WP3, WP4, WP5 | Not started |
| M3: organizations, admin, maps | WP7, WP8, WP6 | Not started |
| M4: hardening and launch | WP10, WP11, WP12 | Not started |

## Branches
Work is a linear chain (each branch contains the previous one). Push the tip.

`main` (old Vite version) < `feat/nextjs-migration` < `feat/i18n-locales` < `feat/i18n-url-routing` < `feat/user-docs` < `feat/easier-forms` < `feat/access-control` < `feat/hospital-role` < `feat/dynamic-roles` < `docs/spec-match-plan` < `feat/m1-real-data` (**current work**)

Nothing has been merged into `main` yet. The owner decides when to open a pull request.

## How to resume
1. `git status`, `git branch --show-current`, `git log --oneline -5`. M1 is done and merged into `main`/`prod`; the next milestone is **M2** (WP3 donors/seeker roles, WP4 matching and notifications, WP5 donation history) — it has no plan file yet, write one first (see `docs/SPEC-MATCH-PLAN.md`).
2. Read `CLAUDE.md`, this file, and the plan for the current milestone. Find the first unchecked task.
3. Run the gates before changing anything: `npm run lint && npm test && npm run build`. All should pass with no environment variables.
4. Work task by task; after each: gates, browser or database check, commit, tick the plan checkbox, add a line to the progress log.

## Testing against a real Postgres (throwaway)
```bash
docker run -d --name bloodlagbe-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=postgres -p 127.0.0.1:54329:5432 postgres:16-alpine
# wait until `docker exec bloodlagbe-test-pg psql -U postgres -tAc "select 1"` answers, then:
DIRECT_URL=postgresql://postgres:test@127.0.0.1:54329/postgres npx prisma migrate deploy
DATABASE_URL=postgresql://postgres:test@127.0.0.1:54329/postgres npm run start   # after npm run build
docker rm -f bloodlagbe-test-pg                                                    # when done
```
Ready-made API checks against that database and a running server: `python3 scripts/verify/check_reads.py` (needs a fresh `npm run db:seed`) and `python3 scripts/verify/check_writes.py` (34 checks: manage token, transitions, duplicates, races). Extend them when the API changes.
To check the UI for screens that need an admin session, serve stand-in API responses from the browser (Playwright `page.route`); the server rules are covered by unit tests and database scripts.
Machine notes for the owner's computer: port 3000 is used by another project (use `--port 3100`); a Supabase stack from another project runs in Docker on ports 5432/6543 and must not be touched; the shell is zsh (an unquoted `$LIST` is not split, run loops with `bash`).

## Decisions taken (defaults, change only with the owner)
- Adopt **Redux Toolkit** (RTK Query for server data) because the spec lists it.
- SOS stays a short form; patient details are an optional collapsed section.
- Blood requests and donor search stay **open to signed-out people**; signed-in people also get "my requests".
- Requests made without an account are managed with a one-time **manage token** kept in the browser (hash stored in the database).
- Donor phone numbers are **masked in lists** and revealed one donor at a time; request contact numbers are public by design (like the Facebook posts this replaces).
- Notifications: in-app first, email/SMS later behind environment switches. Maps: OpenStreetMap + Leaflet.
- Roles are dynamic (created in the Admin Panel); permissions are a fixed list in code.

## Known issues and things not done
- Live Tracker always shows one sample mission; the OTP handshake only shows a toast.
- Hospitals screen: camps are not saved (stock is).
- Admin panel tabs other than Access work on sample data (local state).
- Header ticker makes the page wider than a phone (390px).
- No rate limiting or CAPTCHA on public POST routes (WP11).
- Real Google sign-in and the Supabase admin API were never run (no keys); covered by tests with fakes.

## What the owner will provide
Supabase project keys and Google OAuth credentials (see `docs/SETUP-SUPABASE.md`); later an email/SMS provider (WP4), Cloudflare Turnstile keys (WP11), a Vercel account (WP12).

## Working style the owner prefers
Bengali written in Latin letters mixed with English. Prefers action on sensible defaults over questions; ask only for credentials, destructive steps, or genuine product choices. Reports: short summary of what changed, what was verified, what is still needed from them.

## Progress log
Newest last. One line per finished task: date, what, commit.

- 2026-09-29: M1 started. Created `CLAUDE.md`, this file and the M1 plan.
- 2026-09-29: M1 Task 1 done: Redux Toolkit store + RTK Query slice (`src/store`), `getDonors` endpoint with tests, provider mounted.
- 2026-09-29: M1 Task 2 done: schema (RequestStatus, RequestResponse, manage token hash, patient fields), migration 0005 verified on real Postgres (status conversion, default, unique, cascade, no drift), idempotent `npm run db:seed`.
- 2026-09-29: M1 Task 3 done: pure rules with tests: status transitions + time left, phone masking, manage token hashing, validation for respond/status/queries/patient fields.
- 2026-09-29: M1 Task 4 done: read APIs (donors list, donor contact, requests list, request detail) verified against a seeded real Postgres: filters, paging, ordering, masked phones, error answers.
- 2026-09-29: M1 Task 5 done: mutation APIs (SOS returns one-time manage token, PATCH status with token/owner/permission, respond) with 34 real-database checks incl. two racing updates and four simultaneous identical answers. Checks kept in scripts/verify/.
- 2026-09-29: M1 Task 6 done: RTK Query endpoints (donor contact, requests list/detail, create SOS, respond, update status, register donor) with tag invalidation, and the browser 'my requests' token list, all tested.
- 2026-09-30: M1 Task 7 done: `DonorDirectory.tsx` on `useGetDonorsQuery`/`useLazyGetDonorContactQuery` (server paging, initials avatar, DTO-only fields, call number fetched on press, sample-data fallback and notice on 503); locale keys and donors user-guide section verified in sync. Gates (`lint`, 148 tests, `build`) clean with no env vars; browser-checked in demo mode (no DB) — sample donors, masked phones, call action all render correctly, only the expected 503 in the console. Real-Postgres path (server-side paging, live contact reveal) not checked: Docker unavailable in this sandbox.
- 2026-09-30: M1 Task 8 done: `EmergencyHub`, `RequestTrackingScreen` and `AppStateContext` were already on real data from an earlier fix-up commit; added `CreateSosScreen`'s collapsed "More details" (patient name/age, attendant name, feeding the existing API fields) and fixed its success screen's "Track this request" button, which pointed at the sample Live Tracker instead of Request Tracking's My requests tab. Updated `sos`/`tracking`/`register` locale docs and FAQ q2/q8/q9 (en+bn), which still described pre-M1 sample-only behaviour. Gates green with no environment variables; browser-checked in demo mode (no database): form validates and submits, success page shows despite the expected 503, "Track this request" lands on Request Tracking with the demo notice, no crash. Real-database lifecycle not checked this session (no Docker in this sandbox).
- 2026-09-30: M1 Task 9 done: no Docker on this machine, so used native `postgresql@16` binaries for a throwaway cluster (TCP-only, port 54329) instead — migrations 0001-0005 applied clean, `npm run db:seed` idempotent. `scripts/verify/check_writes.py` (34 checks) and `check_reads.py` (25 checks) both ALL PASS against it. Built and started the app against the real database and drove the full lifecycle in a real browser: posted an SOS, saw it live on the Emergency Hub, responded as an anonymous donor (name+phone), watched it auto-flip PENDING to Donor Found with the responder visible to the manager, marked it Completed — tab counts (Pending/Donor Found/Completed) updated correctly throughout. Donor Directory checked against the same database: real donors listed (masked phones, "Available Now" filter), Call reveals the full number only on press. No-database build/lint/test already green from Tasks 7-8's gate runs.
- 2026-09-30: M1 Task 10 done, M1 finished: `docs/SETUP-SUPABASE.md` now mentions `npm run db:seed` and no longer says the screens read sample data; `docs/SPEC-MATCH-PLAN.md` module/technology tables and milestone table updated (realistic match ~45% to ~65%); this file's "Where the work stands" and milestone table updated. Every checkbox in `docs/superpowers/plans/2026-09-29-m1-real-data.md` is ticked. Branch merged into `main` and `prod` earlier in this session (fast-forward, no conflicts) and pushed; this final doc commit still needs pushing.
- 2026-10-06: Dynamic dashboards Tasks 1-4 done (`docs/superpowers/plans/2026-10-06-dynamic-dashboards.md`): migration `0006_fraud_and_audit` (`fraud_incidents`, `audit_log` tables, seeded); `GET /api/admin/stats`, `GET`+`PATCH /api/admin/fraud(/[id])`, `GET /api/admin/logs` (permission-gated, race-safe fraud resolve, `writeAuditLog` wired into fraud resolve / hospital stock changes / role grant-revoke); matching RTK Query endpoints and tests. `AdminPanelScreen.tsx`'s Overview, Donors, Requests, Hospitals, Fraud and Logs tabs all rewired from hardcoded mock state onto this real data (Donors/Requests/Hospitals need no permission and show real data whenever a database is configured; Overview/Fraud/Logs need a permission this sandbox can't prove without a real Supabase session, so they fall back to sample with a notice the same as "no database" — same limitation Task 2 already has). Gates clean (`lint`, 151 tests, `build`); browser-checked with Playwright against both no-database and a real seeded Postgres on this machine's `.dev-db` — real donor list with masked-until-press Call, real request statuses, real hospital stock, fraud resolve correctly blocked with a toast in sample mode. Cold-chain temperatures, telecom gateway health, and hospital identity/verification stay explicitly-labeled sample (no real data source exists for them). Remaining: Task 6 (Ops Command, a separate file, can run independently), Task 7 (end-to-end verification), Task 8 (docs).
