# WP11: Security, quality and responsiveness

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** Close the remaining gaps the spec calls "hardening": rate limiting and an origin check on the
public mutating routes, an optional CAPTCHA switch, a documented Row-Level-Security confirmation,
Playwright end-to-end tests that actually exercise real flows (not just demo-mode rendering), a
GitHub Actions workflow that proves the "runs with zero environment variables" promise on every push
instead of only being re-checked by hand each session, and the known header-ticker overflow at 390px
plus a 360px sweep of the main screens.

## What exists today (so the gap is concrete)
- Public POST routes with no rate limiting or origin check at all: `POST /api/donors` (register),
  `POST /api/sos` (create a request), `POST /api/organizations/apply`, `POST /api/requests/[id]/respond`
  (grep-confirmed: these are the only `POST` handlers outside `/api/admin/*`, which are already
  permission-gated). `PATCH /api/donors/[id]`, `PATCH /api/requests/[id]` and the two notification PATCH
  routes are state-changing too but already require a manage token or a session to do anything.
- No rate-limiting library, no Turnstile, no Playwright, installed anywhere (`package.json` checked). No
  `.github/workflows` directory. No `playwright.config.*`. This is all greenfield, not finishing
  something partial.
- Every migration that `CREATE TABLE`s also `ENABLE ROW LEVEL SECURITY`s in the same or the very next
  migration (checked all 11 migrations by hand) — including the newest tables from this session's work
  (`organizations`, `donations`, `notifications`). No `CREATE POLICY` exists anywhere, on purpose: RLS is
  on with zero policies, so Supabase's REST API (the `anon`/`authenticated` roles the browser's
  publishable key uses) can read or write **nothing** in any table; only the server, through Prisma's
  `DATABASE_URL` (which connects as a role that bypasses RLS, same as every Postgres superuser-style
  connection), can touch the data. This review found no gap — it is a confirmation, not a fix.
- The header ticker (`src/components/Header.tsx`'s "Main Brand & Action Bar" row, line ~122 onward) packs
  the logo, division selector, bell, language toggle, SOS button and profile pill into one `flex` row
  with **no `flex-wrap` and no `flex-1` to absorb width** — every child is `shrink-0`. At 390px this is
  the more likely overflow source than the critical-alert ribbon above it (which already has a genuine
  `flex-1 min-w-0` marquee absorbing extra width). The exact fix needs measuring at 390px in the browser
  before deciding what to hide/shrink/wrap — not assumed here.
- `docs/HANDOFF.md`'s "Known issues" already lists this plainly: "Header ticker makes the page wider than
  a phone (390px)" and "No rate limiting or CAPTCHA on public POST routes (WP11)."

## Explicitly out of scope (say so, don't fake it)
- Actually provisioning Cloudflare Turnstile keys, a Redis/Upstash instance, or any paid service — all of
  that is the owner's job, the same "needs your own keys" boundary already established for Supabase,
  email and SMS. This package builds the honest switch; it does not and cannot flip it on for real here.
- A distributed/production-grade rate limiter (Upstash Redis or similar) as the *default* — see Task 1's
  honesty note about why an in-memory limiter is a real but limited improvement, not a production
  guarantee, especially once deployed to Vercel (WP12's target).
- CSP headers, full OWASP header hardening, a security.txt, or a penetration test — not asked for by the
  spec line this package is closing ("rate limiting and CAPTCHA ... origin checks ... RLS review").
- Visual redesign of the header — this fixes the overflow, it does not restyle the ticker.
- Automating the Google/Supabase-session-dependent flows in Playwright — this sandbox has never had a
  real Supabase project (same standing limitation noted everywhere else this session), so the E2E suite
  covers the signed-out flows this app's "emergencies need no account" rule already guarantees are the
  important ones, not the admin/hospital-role flows.

## Contracts

### Rate limiting (`src/lib/rateLimit.ts`)
- `checkRateLimit(key: string, opts: { limit: number; windowMs: number }): { allowed: boolean; retryAfterMs: number }`.
  A plain in-memory fixed-window counter (a module-scope `Map<string, { count: number; resetAt: number }>`),
  pure enough to unit-test with an injectable `now()`.
- `clientKey(request: Request, route: string): string` — `` `${route}:${ip}` ``, IP from
  `x-forwarded-for`'s first entry (what Vercel and most proxies set) or `'unknown'` as a single shared
  local-dev bucket.
- **Honest limitation, stated plainly in the code comment and in docs, not just here**: this only works
  within one running server process. It resets on restart and does not share state across multiple
  instances or regions — on Vercel specifically, each function invocation is not guaranteed to reuse a
  warm instance, so this is a soft, best-effort speed bump in that environment, not a hard guarantee.
  Real protection at production scale needs a shared store (Upstash Redis is Vercel's own documented
  pairing) behind an environment variable — not built here, the owner's job once real traffic justifies
  it, exactly like `notifyChannels.ts`'s email/SMS switch.
- Applied as the first check (before touching the database) in the four public POST routes, a sensible
  limit per route (e.g. 5 requests / 10 minutes per IP for `sos`/`donors`/`organizations/apply`, 10 / 10
  minutes for `respond` — these are starting points to tune, not load-tested numbers). A limited request
  gets `429` with a `Retry-After` header.

### Origin check (`src/lib/originCheck.ts`)
- `isSameOrigin(request: Request): boolean` — if the `Origin` header is present, it must match the
  request's own origin (`new URL(request.url).origin`); if `Origin` is **absent**, allow (matches how
  Next.js's own Server Actions origin check behaves, and avoids breaking legitimate same-site tooling —
  curl, this project's own verification scripts, Playwright — that may not send it). This is deliberately
  a defense-in-depth layer, not the only thing standing between a cross-site form and this API: these
  routes already require `Content-Type: application/json`, which triggers a CORS preflight this app
  doesn't answer for foreign origins, so a classic `<form>`-based CSRF already can't reach them. The
  explicit check adds protection for anything that *can* set a JSON content type cross-origin by other
  means.
- Applied to the same four public POST routes, and to `PATCH /api/donors/[id]`/`PATCH /api/requests/[id]`
  (the two routes whose authorization can come from a session cookie, not only a manage token — the
  routes CSRF actually targets).

### CAPTCHA (`src/lib/turnstile.ts`)
- `verifyTurnstileToken(token: string | null | undefined): Promise<boolean>` — resolves `true`
  immediately without a network call when `TURNSTILE_SECRET_KEY` is unset (every environment until the
  owner configures one); otherwise POSTs to Cloudflare's `siteverify` endpoint. Never throws.
- Client: `src/components/TurnstileWidget.tsx` renders Cloudflare's widget script only when
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set; otherwise renders nothing and the form submits with no token,
  matching the server skipping verification. Added to the same four public forms (donor registration,
  SOS creation, organization apply, "I can donate" response).

### Row-Level-Security review
No code changes — a documented confirmation (see "What exists today") plus a short note in
`docs/SETUP-SUPABASE.md` making the server/browser RLS split explicit for whoever reads that doc next.

### Responsive
- `Header.tsx`'s main bar: fix measured at 390px (exact change decided once seen in the browser —
  likely `flex-wrap` on the row plus reordering so the SOS button and brand stay on the first line and
  the rest wraps, or hiding the division-selector label earlier). No new component.
- A 360px Playwright screenshot sweep (manual `browser_resize` + `browser_take_screenshot`, same tool
  this session already used by hand) over: Emergency Hub, Donor Directory, Create SOS, Request Tracking,
  Donor Register, Hospitals, Donor Passport, Sign-in. Fix anything else genuinely broken found this way;
  don't go hunting beyond what's actually broken.

### Playwright E2E (`playwright.config.ts`, `e2e/*.spec.ts`)
- `@playwright/test` as a new devDependency. Config starts `npm run dev` (or `next start` after a build)
  as its `webServer`, `baseURL` the local port, no env vars required by default.
- Two kinds of spec, because a round-trip flow needs a real database and this sandbox (and most CI runs)
  won't always have one:
  - **Demo-mode specs** (no `DATABASE_URL` set): Emergency Hub and Donor Directory render sample data
    with the demo notice, no crash, no console error. This automates, for the first time, a check this
    project has so far only ever done by hand each session.
  - **Real-database specs** (`DATABASE_URL` pointed at a throwaway Postgres): a signed-out visitor posts
    an SOS, sees it on the Emergency Hub, a second signed-out visitor responds "I can donate", the status
    flips to Donor Found; a donor registers, reloads, sees their real "My Profile" panel, edits
    availability. These need a real database to be meaningful — see Task 6 for where that database comes
    from in CI without needing any owner secret.

### GitHub Actions CI (`.github/workflows/ci.yml`)
- A `checks` job: `npm ci`, `npm run lint`, `npm test`, `npm run build` — **zero environment variables**,
  on every push/PR, proving the "runs without any configuration" promise continuously instead of only
  being re-verified by hand each session.
- An `e2e` job: a **Postgres service container** (`services: postgres: image: postgres:16`) — free,
  ephemeral, needs no owner secret, just a localhost connection string to a container GitHub Actions
  itself starts and tears down. Migrate, seed, build, run the real-database Playwright specs against it.

## Tasks

### Task 1: Rate limiting and origin checks
- [x] `src/lib/rateLimit.ts` (6 tests, test-first — allows under the limit, blocks over it, resets after
      the window, independent per key, `clientKey` combines route + IP).
- [x] `src/lib/originCheck.ts` — **real bug found and fixed during Task 2's browser verification, not
      Task 1's own curl check**: the first version compared `Origin` against
      `new URL(request.url).origin`. That works for a forged origin or a missing one (exactly the two
      cases Task 1's curl check covered), but **not for a genuine matching same-origin request** — this
      project's own `npm run dev -- -p PORT` binds `--hostname 0.0.0.0`, so Next.js's `request.url`
      inside the handler reports `http://0.0.0.0:PORT/...`, which never equals a real browser's
      `Origin: http://localhost:PORT`. The donor-registration form 403'd in the browser even with no
      forged anything. Fixed by comparing `Origin`'s host against the `Host` (or `X-Forwarded-Host`)
      request header instead of reconstructing an origin from `request.url` — robust behind a proxy too,
      where the public scheme (`https`) and the internal one (`http`) legitimately differ, which is why
      this intentionally checks host only, not full origin. 6 tests now (was 4), including one that
      reproduces the exact `0.0.0.0` bind scenario.
- [x] Wired both into `POST /api/donors` (5/10min), `POST /api/sos` (5/10min),
      `POST /api/organizations/apply` (5/10min), `POST /api/requests/[id]/respond` (10/10min);
      `isSameOrigin` also into `PATCH /api/donors/[id]` and `PATCH /api/requests/[id]`. A blocked
      request: `429` with `Retry-After` (rate limit) or `403` (`forbidden_origin`), same JSON error shape
      as the rest of this app.
- [x] Added the new test files to `package.json`'s `test` script. Database checks on `.dev-db` (curl,
      re-run after the origin-check fix): a forged `Origin: https://evil.example` correctly 403s on
      `POST /api/donors` and `PATCH /api/donors/[id]`; a **genuinely matching** `Origin` (same host as
      the `Host` header) now correctly passes — the case the first pass's verification had missed;
      requests 1-5 in a 10-minute window succeed, the 6th and 7th both 429 with `retry-after: 593`
      (sensible, ~10 minutes). Test rows removed afterwards.
- [x] Gates clean (`lint`, 233 tests). Commit.

### Task 2: CAPTCHA switch
- [x] `src/lib/turnstile.ts` (7 tests, test-first — skips the network call entirely with no secret
      configured, skips it with no token sent, resolves per Cloudflare's reported success/failure, never
      throws on a network error, sends the right form-encoded fields, `turnstileTokenFromBody` helper).
      `src/components/TurnstileWidget.tsx` per Contracts (renders nothing without
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; loads Cloudflare's script once and reuses it across multiple
      widget instances on the page).
- [x] Wired into the four public forms (`DonorRegistrationScreen.tsx`, `CreateSosScreen.tsx`,
      `HospitalOrgScreen.tsx`'s apply form, `EmergencyHub.tsx`'s "I can donate" modal) and their matching
      POST routes (`turnstileToken` added to `DonorPayload`/`SosPayload`/`OrganizationApplyPayload`/the
      `respondToRequest` mutation); server-side verification skipped, not failed, when unconfigured.
- [x] Gates clean (`lint`, 242 tests, `build`). Browser-checked without a real Turnstile key end to end:
      no widget renders anywhere, a full donor registration (fill form, pick blood group, tick the
      pledge, submit) succeeds exactly as before, no console errors — the "runs with zero environment
      variables" promise holds for this too. This is also where the real `originCheck.ts` host-comparison
      bug (Task 1, above) was actually caught — the first attempt at this exact browser check 403'd.
- [x] Commit.

### Task 3: Row-Level-Security review
- [ ] No code change expected (see "What exists today"); if the review turns up an actual gap, fix the
      specific table's migration the same hand-written way every other migration here is written.
- [ ] `docs/SETUP-SUPABASE.md`: a short paragraph making the server/browser RLS split explicit.
- [ ] Commit (even if docs-only).

### Task 4: Responsive fix
- [ ] Measure `Header.tsx` at exactly 390px in the browser (Playwright `browser_resize`), confirm which
      row actually overflows, fix it there.
- [ ] 360px sweep over the screens listed in Contracts; fix anything genuinely broken found this way.
- [ ] Gates (`lint`/`test`/`build`). Commit.

### Task 5: Playwright E2E tests
- [ ] `@playwright/test` installed, `playwright.config.ts`, `e2e/demo-mode.spec.ts` (no database),
      `e2e/sos-lifecycle.spec.ts` + `e2e/donor-profile.spec.ts` (real database) per Contracts.
- [ ] Run all three locally against `.dev-db` and in true zero-env mode; both must pass. Commit.

### Task 6: GitHub Actions CI
- [ ] `.github/workflows/ci.yml`: `checks` job (zero env vars) and `e2e` job (Postgres service
      container, migrate, seed, build, Playwright) per Contracts.
- [ ] Push the branch (or open a throwaway PR) and confirm both jobs actually go green on GitHub's
      runners, not just "looks right" from reading the YAML — a workflow file that has never run is not
      verified.
- [ ] Commit.

### Task 7: Documentation
- [ ] `docs/HANDOFF.md` progress log (rate limiting's honest Vercel caveat stays visible, not buried);
      `docs/SPEC-MATCH-PLAN.md` WP11 section, milestone table (M4), realistic match update. Remove the
      "No rate limiting or CAPTCHA" and "Header ticker" lines from "Known issues" once actually fixed.
- [ ] Tick every box above. Final commit.
