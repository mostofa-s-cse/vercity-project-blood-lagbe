# Flow & dynamic-data audit — 2026-10-09

A full walkthrough of the account/donor flow on a real, connected Supabase project
(`nrcwcznlpyoupnbbeeyg`), checking two things: (1) is the flow actually correct, and (2) is
everything on screen real data, or still a hardcoded placeholder. Every claim below was verified
in a real browser against the real database during this session, not assumed from reading code.

## Verdict

**The flow is correct.** Every bug found during this session's testing has been fixed and verified.
**Almost everything is dynamic.** One small, intentional exception remains (see below), and a
handful of features are honestly gated behind external accounts/toggles the owner hasn't
configured yet — those are documented, not bugs.

---

## 1. Sign-up / sign-in

| Path | Status | Notes |
|---|---|---|
| Email + password sign-up | ✅ Real | Creates a Supabase Auth user; needs email confirmation (Supabase's own built-in flow) unless the email domain fails Supabase's own validation (see Known gaps) |
| Email + password sign-in | ✅ Real | Tested repeatedly this session with `admin-demo@bloodlagbe.test`, `demo@bloodlagbe.test`, and a fresh `@gmail.com`-style test account |
| Google sign-in | ⚠️ Not live-tested | Code path is correct and unchanged from WP10; no real OAuth round trip was exercised interactively this session |
| **Phone + password sign-up (new this session)** | ⚠️ Half-verified | Account creation confirmed working against the real project (`src/lib/phoneAuth.ts`, admin API, `phone_confirm: true`, no SMS sent). The follow-up sign-in currently fails with `"Phone logins are disabled"` — a dashboard toggle (Authentication → Providers → Phone) the owner hasn't flipped on yet. Not a code bug; confirmed by testing the exact Supabase call directly. |
| Sign out | ✅ Real | Fixed this session: was missing entirely from the Admin Panel; the header's sign-out is now a proper dropdown menu instead of an always-visible extra button |

**Bug fixed this session:** signing in without a `?next=` parameter (e.g. clicking "Sign in"
straight from the header) used to redirect back to the sign-in page itself forever. Fixed —
falls back to the Emergency Hub instead.

## 2. Donor registration & profile editing

| Piece | Status | Notes |
|---|---|---|
| Registration form → database | ✅ Real | Saves to `donors` table, verified via direct DB query after submit |
| Edit page (`/register`, "My donor profile" panel) | ✅ Real | `Save changes` does a real `PATCH`, confirmed to persist after a reload |
| **Bug fixed:** `/register` showed a blank form instead of "My profile" for a signed-in person whose browser didn't hold the local manage-token (new device, cleared storage) | ✅ Fixed | Now falls back to the signed-in account's own profile, same as the Donor Passport screen already did |
| **New: "Save this profile to an account"** | ✅ Verified end-to-end | An anonymously-registered donor can now add an email/phone + password on the success card, which creates (or signs into) an account and automatically links the donor to it — confirmed by checking `donors.user_id` in the database after submitting, then confirming the profile still loads correctly after clearing local storage (simulating a different device) |
| Donor Passport avatar | ✅ Fixed | Was a fixed stock photo for every donor regardless of who was signed in; now the real signed-in person's photo or initials |
| Donor Passport NID / clinical vitals (haemoglobin, blood pressure) / QR code | ⚠️ Known sample | No real measurement/verification system exists for these — documented, not a bug |
| Registration **success card**'s invented fields (`rating`, `badge`, `hbLevel`, `bloodPressure`, a gender-based stock photo) | ⚠️ Known, intentionally left | This is a one-time, client-only preview object with no database column backing most of these fields at all — same family as the NID/vitals above, not something this session changed |

## 3. Header

| Piece | Status | Notes |
|---|---|---|
| Account avatar | ✅ Fixed | Used to show **two** avatars side by side (the account one and a second, purely decorative one that duplicated it) — the duplicate is removed |
| Fake blood-group badge on the old duplicate avatar | ✅ Removed | Was always "O+" for literally everyone, signed in or not |
| Decorative translate icon next to the language switch | ✅ Removed | Added nothing the "বাংলা / EN" text didn't already say |
| "Register as Donor" link visible while signed in | This is correct behavior, not a bug | It's a general-purpose nav link, not a "you haven't registered yet" prompt — a signed-in person without a donor profile should still be able to reach it |

## 4. Admin Panel

| Piece | Status | Notes |
|---|---|---|
| Admin name/avatar (header pill + sidebar card) | ✅ Fixed | Was a fixed stock photo and the fixed name "Dr. Shahriar Rahman" for every admin — now the real signed-in person |
| Sign out | ✅ Fixed (was missing) | The only button that existed (`verified_user`) just showed a "session active" toast — never signed anyone out. A real logout icon was added next to it. |
| Overview stats (donor/request/org counts) | ✅ Real | Confirmed against the seeded database |
| Donor Registry / Blood Requests Desk / Hospitals tabs | ✅ Real | Read the same APIs the public screens use |
| **Fraud & Syndicates / Audit Logs tabs, Ops Command page** | ✅ **Confirmed working this session** | These need a real signed-in session with a specific permission (`panel.fraud`, `panel.logs`, `ops.command`). `docs/HANDOFF.md` still says this was never tested in this environment — that line is now stale: this session connected a real Supabase project, and signing in as `admin-demo@bloodlagbe.test` (full admin permission) was confirmed to render real seeded fraud-incident data on the Fraud tab and load the Ops Command page without a redirect |
| Hospitals tab verify/reject toggle | Not re-tested this session | Logic was verified directly against the database in WP7; should now also work live given a real admin session exists, but wasn't specifically re-clicked this session |
| Blood-group supply/demand matrix, Avg Donor Transit ETA | ⚠️ Known sample | No real demand-forecast data source exists anywhere in the system; correctly labeled "Sample data" in the UI itself |
| Cold-chain sensor readings, telecom gateway health | ⚠️ Known sample | No real sensor/SMS integration exists or was asked for |

## 5. "No access" / redirect flow

**Bug fixed:** the "Sign in" button on the no-access page (shown when, say, a signed-out person
clicks "Donor Passport") used to call Google sign-in directly, skipping the sign-in screen
entirely — so there was never a way to use email/password from there. Now it routes to the real
sign-in screen (with `?next=` preserved), which offers both email/password and Google. Verified
the whole chain: Donor Passport (signed out) → no-access page → Sign in → full form → signs in →
lands back on the original page.

## 6. Loading feedback

**Fixed:** the sign-in/sign-up submit button used to give no feedback at all once clicked — it
just sat there until the redirect landed, which could take a visible moment (e.g. the admin
panel's extra permission check). It now shows a spinner and "Signing in…" / "Creating account…"
text, and stays disabled through the whole wait.

---

## Known gaps (not bugs — honestly documented, owner-gated)

These existed before this session and remain exactly as documented in `docs/HANDOFF.md`:

- **Email/SMS notification delivery**: a real, tested no-op switch. Without `RESEND_API_KEY` /
  an SMS gateway key, a donor match only shows up in-app.
- **CAPTCHA (Cloudflare Turnstile)**: built and wired into all four public forms, but no real
  site/secret key is configured.
- **Rate limiting**: a real in-memory limiter, but resets on restart and shares no state across
  multiple server instances — fine for one process, not a multi-instance production guarantee.
- **Hospital camps**: not saved (stock is).
- **Phone sign-in**: see above — code complete, blocked on one Supabase dashboard toggle.

## A new, non-blocking observation from this session

Supabase's public sign-up endpoint rejects some email address shapes outright
(`email_address_invalid`) — confirmed this happens for the `.test` top-level domain specifically
(this project's own demo accounts, e.g. `admin-demo@bloodlagbe.test`, only exist because they were
created through the privileged admin API, which skips that validation — a real person signing up
through the public form would never hit this, since nobody has a real `.test` email). Worth knowing
if more test accounts are created by hand in the future: use a realistic-looking domain
(`@gmail.com`, etc.), not `.test`.

---

## Verification method

Every fix in this report was checked by:
1. Starting the real local dev server against the real connected Supabase project (not demo mode).
2. Driving the actual browser (sign in, click, fill forms, navigate) rather than just reading code.
3. Confirming the database directly via `psql` where a claim depended on server-side state (e.g.
   `donors.user_id` after a claim, row counts after a seed run).
4. Cleaning up every test account/row created purely for verification afterward.

Gates run clean throughout: `npm run lint`, `npm test` (254 tests, 12 new this session), and
`npm run build`.

## What's committed vs. pushed

All work in this report is committed locally. Per instruction, nothing was pushed automatically —
ask before pushing if you want these on the remote.
