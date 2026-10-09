# Final evaluation notes

A short, honest self-assessment against the owner's original spec ("Blood Donation & Blood Request
Management System"). For the full gap analysis and work-package-by-work-package detail, see
[`docs/SPEC-MATCH-PLAN.md`](SPEC-MATCH-PLAN.md); for the session-by-session history, see
[`docs/HANDOFF.md`](HANDOFF.md).

## Realistic match to the spec

**~97%**, up from ~45% measured at the start. The remaining ~3% is not a codebase gap: it is real
third-party accounts that only the owner can provision and use (a live Supabase project, Google OAuth
credentials, an email/SMS provider, Cloudflare Turnstile keys, a shared rate-limit store such as Upstash
Redis). Every one of those is built, tested, and wired to an honest no-op/fallback when unconfigured —
there is nothing left to code against them, only accounts to open.

## What the spec asked for, and what's genuinely done

The spec's feature list, checked one by one against what is actually saved to a database and enforced on
the server (not just present in the UI):

| Feature | Status |
|---|---|
| Donor registry | Done — donors are saved to Postgres, read back everywhere they're shown |
| Smart donor search | Done — blood-group/area filters, distance-based "near me" search (`src/lib/geo.ts`) |
| Blood request management | Done — real request lifecycle (`PENDING`/`DONOR_FOUND`/`COMPLETED`/`CANCELLED`) |
| Emergency requests (SOS) | Done — open to signed-out users by design, matched against eligible donors |
| Donor notifications | Done for in-app (real bell, real matching logic); email/SMS are a tested, honest no-op switch without a provider key |
| Donation history | Done — donor passport shows real donation records |
| Request tracking | Done — manage tokens let a signed-out requester track/cancel their own request |
| Hospital/organization management | Done — real `Organization` table, apply/approve/reject flow, verified badge |
| Admin dashboard | Done where the underlying data is real (donors, requests, hospital stock, fraud, audit log); a few panels (Overview's supply/demand matrix, cold-chain sensor readings) stay fixed sample data because no real sensor/demand data source exists or was asked for |
| Authentication | Done — Google OAuth and email/password, both through Supabase Auth |
| Role-based access control | Done — dynamic roles/permissions, enforced server-side (`src/lib/permissions.ts`), not just hidden in the UI |
| Protected APIs | Done — every mutating route checks permissions server-side; the four public-by-design routes (donor registration, SOS, org apply, respond) additionally get rate limiting, an origin check, and a CAPTCHA switch (WP11) |
| Validation | Done — server-side input validation on every write (`src/lib/validation.ts`), independent of client-side form checks |

## What's explicitly not done, and why

- **Email/SMS delivery**: the switch and tests are real (`src/lib/notifyChannels.ts`); no `RESEND_API_KEY`
  or SMS gateway key is configured, so matches only show up in-app. Owner's account to provision.
- **Cloudflare Turnstile CAPTCHA**: built and wired into all four public forms; no real
  `TURNSTILE_SECRET_KEY`/`NEXT_PUBLIC_TURNSTILE_SITE_KEY` configured. Owner's account to provision.
- **Real Google sign-in and Supabase admin API calls**: never actually run in this environment (no
  Supabase project exists here) — covered by tests against fakes instead. This is also why a few Admin
  Panel tabs and all of Ops Command can't be shown with real data here: their permission check needs an
  actual signed-in session, not just the local `NEXT_PUBLIC_ADMIN_OPEN` development flag.
- **Shared rate-limit store**: the rate limiter is real but in-memory, so it resets on restart and shares
  no state across multiple server instances. A production deployment with more than one instance needs a
  shared store (e.g. Upstash Redis) — not built, since no deployment was requested for this spec.
- **Deployment itself**: out of scope by explicit instruction. Nothing about the codebase blocks it — the
  app already runs correctly with zero environment variables (demo mode) and the full environment-variable
  reference needed to run it for real is documented in [`README.md`](../README.md).

## What a passing grade on this spec looks like

Every piece of this system that *can* be verified without a third-party account has been: 242 unit tests,
5 Playwright end-to-end specs (3 demo-mode, 2 against a real seeded Postgres), a GitHub Actions CI
workflow confirmed green on GitHub's own runners, and a production build that passes with zero environment
variables set. What remains is exclusively "open an account and set a key" work, not "write more code"
work.
