# Plan: matching the project to the Blood Donation & Blood Request Management System spec

Where we are, measured against the spec you gave (see "Starting point"), and the work packages (WP) that close each gap.

## Status: M1 complete (2026-09-30)

WP9, WP1 and WP2 are done: Redux Toolkit / RTK Query is the client data layer, donors and requests are read from the database (not `mockData.ts`) with the API answering `503` and every screen falling back to sample data when there is no database, and the request lifecycle (`PENDING`/`DONOR_FOUND`/`COMPLETED`/`CANCELLED`, manage tokens, responses) works end to end and was checked against a real Postgres. Realistic overall match: **~65%** (up from ~45% at the start of M1). Details: `docs/HANDOFF.md` progress log.

## Status: WP10 done, out of milestone order (2026-10-08)

Email + password sign-in now sits next to Google, same session and `Profile` row, nothing downstream
changed. `AuthContext.tsx` gained `signUpWithEmail`/`signInWithEmail`/`requestPasswordReset`/
`updatePassword`; new dedicated `sign-in`/`forgot-password`/`reset-password` screens (this app's
form-screen convention, not a header popover). Email verification and password-reset emails are
Supabase Auth's own built-in flow — no bespoke token system was built. This sandbox has no real
Supabase project (same standing limitation as Google sign-in never being run here): the
auth-method-agnostic `/auth/callback` route was confirmed at the code level and the demo-mode fallback
was browser-checked; the actual signed-in flows were not verified against a live project. Realistic
overall match: **~97%**. Plan: `docs/superpowers/plans/2026-10-08-wp10-email-auth.md`.

## Status: WP4 done (2026-10-08)

Posting an emergency request now matches and notifies real compatible donors: the full ABO/Rh
compatibility table (not just equal groups), available, eligible (WP5's 90-day rule), not the
requester, and nearby (WP6's distance, or an area/division text fallback). A `Notification` row is
created per match; the bell reads/marks-read against the real database. Found along the way: the bell
was fully wired UI running on entirely fake, per-browser sample data (not merely unbuilt) — deleted
rather than built around. Email/SMS delivery is an honest, tested no-op switch; no provider account is
wired (the owner's job, same as Supabase keys). Realistic overall match: **~90%**. Plan:
`docs/superpowers/plans/2026-10-08-wp4-matching-notifications.md`.

## Status: WP6 done, out of milestone order (2026-10-08)

Location is now real end to end. A real Bangladesh administrative dataset (8 divisions, 64 districts
with centroid coordinates, 494 upazilas — licence verified before vendoring) replaces an invented
5-item division list. Donors, requests and organizations can carry a real coordinate; "near me" (an
explicit browser-geolocation opt-in, never auto-prompted) sorts the donor, request and organization
list endpoints by straight-line distance (`src/lib/geo.ts`, a SQL bounding-box pre-filter plus exact
Haversine). The Emergency Hub and Hospitals screen each gained an OpenStreetMap/Leaflet map toggle.
Donor markers are deliberately not built (would undo the masked-phone privacy rule); routing/ETA,
address autocomplete and PostGIS stay out of scope at this app's scale. Realistic overall match:
**~84%**. Plan: `docs/superpowers/plans/2026-10-08-wp6-location-maps.md`.

## Status: WP7 done, out of milestone order (2026-10-08)

Hospital/organization identity and verification is now a real `Organization` table instead of
`SAMPLE_HOSPITAL_ORGS`: anyone can apply (no login) from `HospitalOrgScreen.tsx`'s collapsed apply
form; an admin approves or rejects from the Admin Panel's Hospitals tab, which also grants the
Hospital staff role tied to that organization when the applicant is a known signed-in profile.
Blood stock keeps working exactly as before (same `HospitalStock` table, now keyed against real
organization ids). Organizations managing the requests addressed to them stays explicitly out of
scope (no foreign key links a request to an organization — see the WP7 section below). Realistic
overall match: **~78%**. Plan: `docs/superpowers/plans/2026-10-08-wp7-organizations.md`.

## Status: WP5 done, out of milestone order (2026-10-08)

A completed request now writes a real `Donation` row (donor, request, hospital, units, date) for every
responder who is a registered donor, and sets that donor's `lastDonationAt`. Availability is now
automatic where the spec asked for it: `isEligible` (90-day rule) combines with the manual `isAvailable`
switch everywhere "available" is checked. The Donor Passport shows a real donor's real blood group,
cooldown and history instead of the fixed sample. Clinical vitals, NID and QR code are not invented —
no real measurement or verification system exists for them. Plan: `docs/superpowers/plans/2026-10-07-wp5-donation-history.md`.

## Status: WP3 done, out of milestone order (2026-10-07)

A donor can now edit their own profile (availability, last donation, contact) whether they registered
signed in or with a manage token (same pattern M1 built for requests). `POST /api/donors` returns the
token; `PATCH /api/donors/[id]` applies edits; `GET /api/donors?mine=1` lists a signed-in person's own
profiles. Availability stays a manual toggle — the automatic 90-day eligibility calculation from a real
`lastDonationAt` is WP5's job, not duplicated here. Plan: `docs/superpowers/plans/2026-10-07-wp3-donor-profiles.md`.

## Status: Admin dashboard (WP8) in progress, out of milestone order (2026-10-06)

Taken out of order from M3 because the Admin Panel and Ops Command were the two biggest remaining "looks real, isn't" screens. Added `FraudIncident` and `AuditLog` tables/APIs; rewired the Admin Panel's Overview/Donors/Requests/Hospitals/Fraud/Logs tabs and all of Ops Command off hardcoded mock state onto real data wherever a real source exists. Still sample, honestly labeled: hospital identity/verification (needs the `Organization` model, WP7), cold-chain sensor readings and telecom gateway health (no real integration exists or is planned), and Avg Donor Transit ETA / demand forecasting (no such data anywhere). Plan and verification detail: `docs/superpowers/plans/2026-10-06-dynamic-dashboards.md`.

## Starting point (measured from the code, before M1)

| Lens | Match |
|---|---|
| Screens and features exist (UI level) | ~62% |
| Technical stack and spec tools | ~61% |
| Works end to end (saved in the database, for every user, checked on the server) | ~21% |
| **Realistic overall** | **~45%** |

What is real today: Google sign-in (Supabase), the database schema and migrations (Prisma), dynamic roles and permissions with server checks, hospital stock saved per hospital, donors and SOS requests **saved** to the database, server-side input validation, English and Bengali, 90 unit tests.

The main gap: donors and SOS requests are **write-only**. The directory, the hub, request tracking, notifications, the passport and most of the admin tabs still read sample data from `src/data/mockData.ts`.

## Spec versus reality, by module

| Spec module | Today | Missing |
|---|---|---|
| 1. Donor Registry | Registration form saves to the database and is **read back** in the directory (M1); a donor can **edit their own profile** (availability, last donation, contact) with a manage token or signed in (WP3) | Automatic eligibility from a real last-donation date (WP5) |
| 2. Smart Donor Search | Filters (group, availability, text) search the **real database**, server-paged (M1); real location (WP6): a real division→district picker, optional coordinates, "near me" distance sort, OpenStreetMap/Leaflet markers; **real blood-group compatibility matching (WP4)**, reusing the same distance/eligibility logic | Compatibility used for sorting the donor directory itself (currently only drives who gets notified on a new SOS) |
| 3. Blood Request Management | SOS saved and **read back**; list, view, cancel/complete my requests with a manage token; patient information (M1) | Edit a posted request |
| 4. Emergency Request | Emergency and open requests **rank first** from the API; a "within 1 hour"/"within 4 hours" countdown (M1); **posting one now matches and alerts real compatible donors (WP4)** | — |
| 5. Donor Notifications | **Real** (WP4): a `Notification` row per compatible, available, eligible, nearby donor on every new SOS; the bell reads/marks-read against the real database, replacing what was entirely fake sample data before this | Email/SMS delivery stays an honest no-op switch — no provider account exists yet (push was never requested) |
| 6. Donation History | A completed request writes a real `Donation`; the Passport shows real history and the automatic 90-day cooldown (WP5) | Clinical vitals/NID/QR stay sample on purpose (no real source) |
| 7. Request Tracking | **Real statuses and transitions** (Pending, Donor Found, Completed, Cancelled) from the database, server-enforced (M1) | Priority/urgency beyond emergency-first |
| 8. Hospital & Organization | Hospital role, own-hospital stock saved; **real `Organization` accounts, apply + admin approve/reject (WP7)** | Organizations managing the requests addressed to them (out of scope, see WP7) |
| 9. Admin Dashboard | Roles real; donor/request/hospital-stock/fraud-report tabs and the activity log now read the database (Ops Command too); **organization verification now real (WP7)** | Real user list, moderation |

| Spec technology | Today | Missing |
|---|---|---|
| Redux Toolkit | **Adopted (M1)**: store + RTK Query is the client data layer | Auth slice beyond the existing `AuthContext` |
| REST API | **Read/update endpoints added (M1)**: donors, requests, respond, status, pagination | Delete; district/radius filters |
| Secure authentication | Google + **email/password, password reset (WP10)**, both through Supabase Auth | Rate limiting/CAPTCHA on sign-up/sign-in themselves (they go straight to Supabase's own client SDK, not one of this app's own API routes — WP11's rate limiting/CAPTCHA cover the donor/SOS/organization/respond routes instead, see WP11) |
| Roles: Donor, Blood Seeker, Hospital/Org, Admin | Hospital and Admin (as dynamic roles) | Donor and Blood Seeker |
| Protected API | Admin and hospital routes; **the four public mutating routes (donors/sos/organizations-apply/respond) now have rate limiting, an origin check and a CAPTCHA switch (WP11)** | A real Turnstile key (owner's job); a shared rate-limit store for multi-instance deployments |
| Notification system | **Real (WP4)**: a `Notification` table, matching and in-app delivery | Email/SMS provider accounts (switch is wired, provider isn't) |
| Location search and maps | Fake distance numbers, a picture of a map | See WP6 |
| Responsive UI | **Mostly, and the known header overflow at 360-390px is fixed (WP11)** | — |

## Decisions (defaults I will use unless you say otherwise)

| Decision | Default |
|---|---|
| Redux Toolkit is in the spec | **Adopt it**: RTK Query for server data (donors, requests, notifications), a small slice for the signed-in user. Purely visual state stays in components. |
| SOS is a short Facebook-style post today; the spec lists patient information | Keep the short form, add an optional collapsed "more details" (patient name, age, condition, attendant name). |
| Blood requests without an account | **Stay open.** Nobody needs an account in an emergency. Signed-in people additionally get "my requests". |
| Email and password sign-in | Add next to Google (Supabase Auth), WP10. |
| Notification channels | In-app first (stored in the database). Email and SMS are added behind environment switches; they need your provider account. |
| Maps | OpenStreetMap with Leaflet: free, no API key. |

## Work packages

Sizes: **S** = a focused session, **M** = several sessions, **L** = a large piece. "Gain" is the estimated rise in the realistic overall match.

### WP9. Redux Toolkit and API layer (M, +3%). Do first — **Done (M1)**
- Add `@reduxjs/toolkit` and `react-redux`; a store provider in the root layout.
- RTK Query API slice with tags (`Donor`, `Request`, `Notification`, `Hospital`).
- An auth slice fed from the existing `AuthContext`.
- Move donors, demands and notifications out of `AppStateContext` into RTK Query. Keep modal and toast state where it is.
- Done when: no screen imports lists from `mockData.ts` for live data; unit tests for the slice and selectors.

### WP1. Real data everywhere (L, +15%) — **Done (M1)**
- New read APIs: `GET /api/donors` (filters: group, availability, text, page), `GET /api/requests` (status, emergency, blood group, ids, mine, page), `GET /api/requests/[id]`.
- Screens switch from sample data to RTK Query: Donor Directory, Emergency Hub, Request Tracking. (Live Tracker and Hospitals list are still sample data — out of M1's scope.)
- A **seed script** (`prisma/seed.ts`) loads the current sample data into the database, so demos look the same.
- Pagination and indexes (blood group + availability + createdAt).
- Done when: a donor registered in one browser appears in the directory in another; the hub shows a new SOS. Checked against a real Postgres.

### WP2. Request lifecycle (M, +8%) — **Done (M1)**
- Statuses `PENDING`, `DONOR_FOUND`, `COMPLETED`, `CANCELLED` in the schema (migration `0005` converts the old `ACTIVE`/`FULFILLED`/`CANCELLED`).
- `PATCH /api/requests/[id]` for the manage-token holder, the owner and `panel.requests`; allowed transitions enforced on the server and unit-tested (race-safe: a racing pair of updates cannot both win).
- `POST /api/requests/[id]/respond`: a donor says "I can donate" (moves `PENDING` to `DONOR_FOUND`, records the response; duplicate phone and closed requests refused).
- Emergency and still-open requests sort first.
- Done when: the whole path Pending, Donor Found, Completed works for real users and every transition is permission-checked. Verified with 34 scripted checks (`scripts/verify/check_writes.py`) plus a real-browser run of the full lifecycle.

### WP3. Donor and Blood Seeker roles, profiles (M, +6%) — **Done (2026-10-07)**
- Every signed-in person is a Blood Seeker automatically (already true — SOS/search are open to everyone since M1); becoming a Donor is registering a donor profile, linked to the account when signed in, or managed with a one-time manage token when not (no separate `requests.own`/`donor.profile` permissions needed — this isn't an admin-panel permission, it's request/donor ownership, same triad as M1's request manage tokens).
- "My profile" (edit donor info, availability switch, last donation date) in `DonorRegistrationScreen.tsx`; "My requests" was already done in M1.
- Done when: a donor can update their own profile and cannot touch anyone else's (server-tested).

### WP4. Matching and notifications (L, +8%) — **Done (2026-10-08)**
- `Notification` table (one row per matched donor, belongs to the `Donor` row, same ownership model WP3
  built for profile editing).
- Matching on `POST /api/sos`: blood-group **compatibility** (the full ABO/Rh table, not only equality),
  nearby (real coordinates within 50km when both sides have one, WP6; otherwise an exact area/division
  text match — an under-specified request matches nobody, never everybody), available, eligible (the
  real 90-day rule, WP5), and not the requester.
- Bell reads from the real API; mark as read persists server-side; unread count is real.
- Delivery: in-app is real and built on top of this package; email/SMS get an honest, tested
  environment-variable switch (`sendEmail`/`sendSms` in `src/lib/notifyChannels.ts`) that silently skips
  without a configured provider key — no real provider is wired in this package, same spirit as every
  other "needs the service key" action in this app. Web push was not requested and is not built.
- Found along the way: the bell was fully wired UI running on entirely fake, per-browser
  (`localStorage`) sample data — not "not yet built", but actively fake — including a poster
  self-notifying about their own SOS. Deleted rather than built around.
- Verified end to end against a real local Postgres: 5 donors covering every exclusion case (wrong
  group, unavailable, ineligible, wrong area) plus the one correct compatible/available/eligible/nearby
  donor — exactly that one got notified; the bell showed it after reload, mark-as-read persisted.

### WP5. Donation history and availability (S to M, +4%) — **Done (2026-10-08)**
- `Donation` model (donor, request, hospital, date, units, confirmed by).
- A request marked `COMPLETED` writes the donation; the donor's history page (Donor Passport) reads it.
- Availability is derived from `lastDonationAt + 90 days` (`isEligible`), combined with — not replacing — the manual `isAvailable` switch (a donor can still pause themselves even while eligible).

### WP7. Hospital and organization accounts (M, +6%) — **Done (2026-10-08)**
- `Organization` table (hospital, blood bank, organization; licence; verified flag), replacing the hospital sample data; stock moves onto it (same `HospitalStock` table as before, keyed the same way).
- A person applies for an organization account (`HospitalOrgScreen.tsx`'s collapsed apply form, no login required); an admin approves or rejects from the Admin Panel's Hospitals tab; approval grants the hospital role tied to that organization (caught and skipped gracefully when no Supabase service key is configured, same rule as every other "needs the service key" action).
- Explicitly out of scope, documented rather than faked: organizations seeing/managing the requests addressed to them (`SosRequest.place` is free text, not a foreign key to `Organization`); cold-chain sensor readings and licence-document upload stay sample, same reasoning as WP8.

### WP8. Real admin dashboard (M, +6%) — **in progress, started out of order (2026-10-06)**
- Done: `FraudIncident` model (the `Report`-equivalent people flag) with a real Fraud tab (shared by Admin Panel and Ops Command); `AuditLog` table written by fraud resolution, hospital stock changes and role grant/revoke, read by the Logs tab; Overview/Donors/Requests/Hospitals tabs and Ops Command's SOS queue/stock matrix/fraud tab all read the database instead of `mockData.ts`; hospital identity/verification is now real too (WP7).
- Still missing: users list (profiles and roles) as its own tab, donor and request moderation actions.

### WP6. Location and maps (L, +7%) — **Done (2026-10-08)**
- Real Bangladesh administrative dataset (8 divisions, 64 districts with real centroid coordinates, 494
  upazilas — licence verified via the GitHub API before vendoring, `src/data/BDGEO_SOURCE.md`),
  replacing an invented 5-item division list; nullable `latitude`/`longitude` on `Donor`, `SosRequest`,
  `Organization`.
- "Near me" with the browser's Geolocation API (explicit opt-in, never auto-prompted); distance computed
  server-side (Haversine + a SQL bounding-box pre-filter, `src/lib/geo.ts`) and used for sorting on the
  donors/requests/organizations list endpoints. PostGIS not needed at this scale (documented as a future
  scaling note, not built).
- OpenStreetMap map (Leaflet + react-leaflet, no API key): request markers on the Emergency Hub,
  organization markers on the Hospitals screen. Donor markers deliberately not built — showing a donor's
  home coordinate on an open map would undo the existing masked-phone privacy rule.
- Matching/compatibility-ranking by distance and notifications on top of this distance data are WP4's
  job, not duplicated here; turn-by-turn routing/ETA, address autocomplete and boundary polygons stay
  out of scope (plan: `docs/superpowers/plans/2026-10-08-wp6-location-maps.md`).

### WP10. Email and password (S, +2%) — **Done (2026-10-08)**
- Sign up, sign in and password reset with Supabase Auth next to Google; email verification is
  Supabase's own built-in confirmation flow (no bespoke token system built — never roll your own).
  `AuthContext.tsx` gained `signUpWithEmail`/`signInWithEmail`/`requestPasswordReset`/`updatePassword`;
  new dedicated `sign-in`/`forgot-password`/`reset-password` screens, same session/`Profile`/roles as
  Google — nothing downstream needed to change.
- This sandbox has no real Supabase project (same standing limitation as Google sign-in never being run
  here): the auth-method-agnostic `/auth/callback` route was confirmed at the code level, and the
  demo-mode fallback (hides everything without Supabase keys, exactly like the Google button) was
  browser-checked; the actual signed-in flows were not verified against a live project — said so
  plainly rather than overclaiming.

### WP11. Security, quality and responsiveness (M, +3%) — **Done (2026-10-08)**
- Rate limiting (`src/lib/rateLimit.ts`, an honest in-memory fixed-window limiter — real but limited:
  resets on restart, no cross-instance state, a soft speed bump on Vercel specifically, not a hard
  guarantee; a shared store like Upstash Redis is the real production answer, not built here) and an
  origin check (`src/lib/originCheck.ts`) on the four public POST routes. A Cloudflare Turnstile CAPTCHA
  switch (`src/lib/turnstile.ts`/`TurnstileWidget.tsx`) wired into the same four forms, skipped (not
  failed) without a real key — the owner's Cloudflare account, same boundary as every other "needs your
  own keys" item in this app.
- Row-Level-Security audited table by table (all 11 migrations): every `CREATE TABLE` has a matching
  `ENABLE ROW LEVEL SECURITY`, zero `CREATE POLICY` anywhere — confirmed, no gap.
- Playwright end-to-end tests: 3 demo-mode specs (no database) and 2 real-database specs (the full SOS
  lifecycle between two signed-out visitors; donor registration and profile editing). GitHub Actions
  (`.github/workflows/ci.yml`): a zero-env `checks` job and an `e2e` job with a free Postgres service
  container — confirmed **actually green on GitHub's own runners**, not just read from the YAML.
- Fixed the header-ticker overflow at 390px — two real bugs, not the one originally suspected (a missing
  `flex-wrap`, and separately a classic nested-flexbox `min-w-0` trap that only showed up at 360px) — and
  swept 360px/390px across both languages over all 8 main screens.
- Found and fixed a real bug along the way: the origin check's first version compared against
  `new URL(request.url).origin`, which broke on this project's own dev server (`--hostname 0.0.0.0`
  means `request.url` never matches a real browser's `Origin`) — caught by browser-testing the CAPTCHA
  switch, not by the origin check's own curl verification, which hadn't covered a genuinely matching
  origin.

### WP12. Deployment and documentation (S, +2%)
- Vercel deployment guide and environment checklist; seeded demo database; README with architecture; the final evaluation notes the spec asks for.

## Milestones

| Milestone | Packages | Realistic match after |
|---|---|---|
| **M1: real data and lifecycle** | WP9, WP1, WP2 | ~65% — **done** |
| **M2: donors and notifications** | WP3, WP4, WP5 | ~80% — WP3, WP4 and WP5 **done** |
| **M3: organizations, admin, maps** | WP7, WP8, WP6 | ~92% — WP7 and WP6 **done**, WP8 in progress |
| **M4: hardening and launch** | WP10, WP11, WP12 | ~97% — WP10 **done** (out of milestone order), WP11/WP12 remain |

Each package ends with tests, a build, a browser check, and a commit, as before.

## What I need from you, and when

| Item | For | When |
|---|---|---|
| Nothing | M1 | Can start now |
| Email provider account (Resend or SMTP) and an SMS gateway account | Email and SMS notifications (WP4) | Before WP4 delivery channels; in-app notifications need nothing |
| Supabase project (already needed) | Everything server-side | Already in `docs/SETUP-SUPABASE.md` |
| Cloudflare Turnstile keys | CAPTCHA (WP11, built and wired, switched off without a key) | Whenever real bot protection is wanted |
| Vercel account | Deployment (WP12) | Before WP12 |
