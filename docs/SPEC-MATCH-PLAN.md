# Plan: matching the project to the Blood Donation & Blood Request Management System spec

Where we are, measured against the spec you gave (see "Starting point"), and the work packages (WP) that close each gap.

## Status: M1 complete (2026-09-30)

WP9, WP1 and WP2 are done: Redux Toolkit / RTK Query is the client data layer, donors and requests are read from the database (not `mockData.ts`) with the API answering `503` and every screen falling back to sample data when there is no database, and the request lifecycle (`PENDING`/`DONOR_FOUND`/`COMPLETED`/`CANCELLED`, manage tokens, responses) works end to end and was checked against a real Postgres. Realistic overall match: **~65%** (up from ~45% at the start of M1). Details: `docs/HANDOFF.md` progress log.

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
| 2. Smart Donor Search | Filters (group, availability, text) search the **real database**, server-paged (M1) | Real location; blood-group compatibility; eligibility ranking (WP6) |
| 3. Blood Request Management | SOS saved and **read back**; list, view, cancel/complete my requests with a manage token; patient information (M1) | Edit a posted request |
| 4. Emergency Request | Emergency and open requests **rank first** from the API; a "within 1 hour"/"within 4 hours" countdown (M1) | Alerts donors (WP4) |
| 5. Donor Notifications | Bell with sample items | Matching by group and location; stored notifications; email/SMS/push |
| 6. Donation History | A completed request writes a real `Donation`; the Passport shows real history and the automatic 90-day cooldown (WP5) | Clinical vitals/NID/QR stay sample on purpose (no real source) |
| 7. Request Tracking | **Real statuses and transitions** (Pending, Donor Found, Completed, Cancelled) from the database, server-enforced (M1) | Priority/urgency beyond emergency-first |
| 8. Hospital & Organization | Hospital role, own-hospital stock saved; **real `Organization` accounts, apply + admin approve/reject (WP7)** | Organizations managing the requests addressed to them (out of scope, see WP7) |
| 9. Admin Dashboard | Roles real; donor/request/hospital-stock/fraud-report tabs and the activity log now read the database (Ops Command too); **organization verification now real (WP7)** | Real user list, moderation |

| Spec technology | Today | Missing |
|---|---|---|
| Redux Toolkit | **Adopted (M1)**: store + RTK Query is the client data layer | Auth slice beyond the existing `AuthContext` |
| REST API | **Read/update endpoints added (M1)**: donors, requests, respond, status, pagination | Delete; district/radius filters |
| Secure authentication | Google | Email and password, password reset |
| Roles: Donor, Blood Seeker, Hospital/Org, Admin | Hospital and Admin (as dynamic roles) | Donor and Blood Seeker |
| Protected API | Admin and hospital routes | Rate limiting and CAPTCHA on public routes |
| Notification system | None | See WP4 |
| Location search and maps | Fake distance numbers, a picture of a map | See WP6 |
| Responsive UI | Mostly | The header ticker overflows on phones (390px) |

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

### WP4. Matching and notifications (L, +8%)
- `Notification` table; one row per recipient.
- Matching when a request is created: blood-group **compatibility** (not only equality), same district or nearby, available, eligible (at least 90 days since the last donation), and not the requester.
- Bell reads from the API; mark as read; unread count.
- Delivery: in-app always; email (Resend or SMTP) and SMS (a Bangladeshi SMS gateway or Twilio) behind environment variables; optional web push (VAPID keys are self-generated).
- Done when: creating an emergency request creates notifications for exactly the matching donors (unit-tested), and the bell shows them after a reload.
- Needs from you: email and SMS provider accounts, if you want those channels.

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

### WP6. Location and maps (L, +7%)
- Districts and upazilas dataset for Bangladesh; latitude and longitude on donors, requests and organizations.
- "Near me" with the browser's location; distance computed on the server (Haversine, or PostGIS on Supabase for indexing) and used for sorting and notifications.
- OpenStreetMap map (Leaflet): donors, requests and hospitals as markers.
- Needs: the administrative dataset (I will source an open one and document the licence).

### WP10. Email and password (S, +2%)
- Sign up, sign in and password reset with Supabase Auth next to Google; email verification.

### WP11. Security, quality and responsiveness (M, +3%)
- Rate limiting and CAPTCHA (Cloudflare Turnstile) on the public POST routes; origin checks; a Row-Level-Security review.
- Playwright end-to-end tests for the main flows; GitHub Actions running lint, tests, build.
- Fix the phone overflow (header ticker) and check every screen at 360px.

### WP12. Deployment and documentation (S, +2%)
- Vercel deployment guide and environment checklist; seeded demo database; README with architecture; the final evaluation notes the spec asks for.

## Milestones

| Milestone | Packages | Realistic match after |
|---|---|---|
| **M1: real data and lifecycle** | WP9, WP1, WP2 | ~65% — **done** |
| **M2: donors and notifications** | WP3, WP4, WP5 | ~80% — WP3 and WP5 **done**, WP4 remains |
| **M3: organizations, admin, maps** | WP7, WP8, WP6 | ~92% — WP7 **done**, WP8 in progress, WP6 remains |
| **M4: hardening and launch** | WP10, WP11, WP12 | matches the spec |

Each package ends with tests, a build, a browser check, and a commit, as before.

## What I need from you, and when

| Item | For | When |
|---|---|---|
| Nothing | M1 | Can start now |
| Email provider account (Resend or SMTP) and an SMS gateway account | Email and SMS notifications (WP4) | Before WP4 delivery channels; in-app notifications need nothing |
| Supabase project (already needed) | Everything server-side | Already in `docs/SETUP-SUPABASE.md` |
| Cloudflare Turnstile keys | CAPTCHA (WP11) | Before WP11 |
| Vercel account | Deployment (WP12) | Before WP12 |
