# WP10: Email and password sign-in

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** Sign up, sign in and reset a forgotten password with email + password, next to the existing
"Sign in with Google" button — same session, same `Profile` row, same roles/permissions, nothing about
the rest of the app changes. Email verification uses Supabase Auth's own built-in confirmation flow.

## What exists today (so the gap is concrete, and so this plan builds on real contracts, not assumed ones)
- `src/context/AuthContext.tsx` only exposes `signInWithGoogle`/`signOut`. It gets the signed-in user
  from `supabase.auth.getSession()` + `onAuthStateChange`, and maps *any* session's `user` into
  `AuthUser` via `toAuthUser()` — this does not care how the session was created. An email/password
  session needs no changes here beyond adding the new methods; every existing `can()`/
  `canManageHospital()`/permission check keeps working unchanged.
- `src/app/auth/callback/route.ts` trades a one-time `?code=` for a session (`exchangeCodeForSession`),
  calls `syncProfile()` (writes/updates the `Profile` row — the same one every role grant and
  `canManageDonor()`-style check already relies on) and applies any waiting role grant. This route is
  **auth-method-agnostic**: Google's OAuth redirect, Supabase's "confirm your email" link, and Supabase's
  "reset your password" link all arrive here the same way, because `@supabase/ssr`'s `createBrowserClient`
  (`src/lib/supabase/client.ts`) defaults to the PKCE flow for every auth method, not just OAuth. **This
  needs confirming against a real Supabase project** (this sandbox has none — same limitation already
  noted for Google sign-in in `docs/HANDOFF.md`), not just asserted from the library's documented
  default; Task 1 below is exactly that confirmation plus pinning it explicitly in code so it's never
  accidental.
- `grep`ed the repo: no `signInWithPassword`/`signUp`/`resetPasswordForEmail`/`updateUser` call exists
  anywhere. This is a clean, from-scratch addition, not finishing something partial.
- `src/components/AuthButton.tsx` is a single header button (sign in / sign out), no modal, no form —
  fine for a one-click OAuth redirect, not enough surface for an email+password form. This app's
  convention for anything form-shaped is a dedicated screen (`DonorRegistrationScreen.tsx`,
  `CreateSosScreen.tsx`, ...), not a header popover, so email/password gets dedicated screens the same way.
- `src/utils/routes.ts`'s `SCREEN_PATHS` and `src/proxy.ts`'s `requiredAccess()` are the two places a new
  page needs registering; new auth pages aren't admin/hospital-restricted, so `requiredAccess()` needs no
  changes — they're open to everyone (signed in or not) same as the emergency screens.
- `docs/SETUP-SUPABASE.md` documents Google sign-in's Supabase-dashboard setup step by step; email/password
  needs the same kind of section (enabling the Email provider, the Confirm-signup/Reset-password email
  templates, the redirect-URL allowlist) since none of that is configurable from this codebase.

**Explicitly out of scope (say so, don't fake it):**
- Rate limiting or CAPTCHA on sign-up/sign-in/password-reset — WP11's job (security hardening), same as
  every other public POST route in this app today.
- Custom password hashing, a password column anywhere in this app's own Prisma schema, or a bespoke
  "verify your email" token system — Supabase Auth already does all of this; duplicating it would be
  both redundant and a real security liability (never roll your own password storage).
- Actually configuring the Supabase project's email templates, SMTP sender, or redirect-URL allowlist —
  that's the owner's Supabase dashboard, the same "needs your own keys" boundary as every other Supabase
  setting in this app (`docs/SETUP-SUPABASE.md`). This plan documents exactly what to configure and why,
  it does not and cannot configure it from inside this repo.
- Social providers beyond Google (Facebook, Apple, ...) — not asked for.
- Changing how roles/permissions/`Profile` work — an email/password account is a `Profile` row exactly
  like a Google one; nothing downstream needs to know which one a person used.

## Contracts

### `AuthContext.tsx` additions
```ts
signUpWithEmail(email: string, password: string, next?: string): Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
signInWithEmail(email: string, password: string): Promise<{ error: string | null }>;
requestPasswordReset(email: string, next?: string): Promise<{ error: string | null }>;
updatePassword(newPassword: string): Promise<{ error: string | null }>;
```
- `signUpWithEmail` calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`.
  When email confirmations are on (the Supabase project default), `data.session` comes back `null` even
  on success — that's `needsEmailConfirmation: true`, not an error; the UI shows "check your email",
  it does not sign the person in yet.
- `signInWithEmail` calls `supabase.auth.signInWithPassword({ email, password })`. An unconfirmed email
  is a real Supabase error (`email_not_confirmed`) — shown as "check your email and confirm it first",
  not a generic failure.
- `requestPasswordReset` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo:
  `${origin}/auth/callback?next=/reset-password` })`. Always resolves the same way whether or not the
  email exists (Supabase's own anti-enumeration behaviour) — the UI shows one neutral "if that address
  has an account, check your email" message either way, never "no account with that email".
- `updatePassword` calls `supabase.auth.updateUser({ password: newPassword })`, valid only when the
  browser is holding the short-lived recovery session the callback route's code-exchange just created.
- Every method returns `{ error: string | null, ... }` (this project's non-strict-TS result convention,
  `CLAUDE.md`), never throws, same spirit as `signInWithGoogle`/`signOut` today.

### New routes (no change to `src/app/auth/callback/route.ts` itself — see Task 1)
| `ScreenId` | Path | Page |
|---|---|---|
| `sign-in` | `/sign-in` | Email + password sign-in, a "Create an account" toggle to the sign-up form on the same screen, a "Forgot password?" link, and the existing Google button so there's one place to sign in however a person wants. |
| `forgot-password` | `/forgot-password` | One email field, calls `requestPasswordReset`. |
| `reset-password` | `/reset-password` | Where `requestPasswordReset`'s email links land (via `/auth/callback?next=/reset-password`): new password + confirm, calls `updatePassword`. Showing this page without a valid recovery session (direct navigation) shows an explanatory message instead of a broken form. |

`AuthButton.tsx`'s "Sign in" button navigates to the `sign-in` screen instead of calling
`signInWithGoogle()` directly; the Google button moves onto that screen next to the new form.

### Pure logic (`src/lib/authValidation.ts`, if there's enough real logic to earn the file)
Supabase enforces its own password minimum server-side — this is not duplicated. The only client-side
validation worth a pure, tested module is: a trimmed/lower-cased email format check (reusing the same
`@`-and-dot regex `src/lib/validation.ts` already uses for grants/organizations, not inventing a second
one) and "do the two password fields match". If that is genuinely all of it, a few lines directly in the
screen components (with no separate test file) is more honest than manufacturing a module to satisfy the
"pure logic gets a file" convention — decide this for real once the forms are being written, don't
pre-commit to a file that might end up being two trivial one-liners.

## Tasks

### Task 1: Confirm the auth-method-agnostic callback, pin the flow explicitly
- [x] This sandbox has no real Supabase project — same standing limitation already recorded in
      `docs/HANDOFF.md` for Google sign-in ("Real Google sign-in and the Supabase admin API were never
      run (no keys)"), so `signUp`/`signInWithPassword`/`resetPasswordForEmail` could not be triggered
      against a live project here. Reasoned through the code path instead and confirmed it precisely:
      `src/app/auth/callback/route.ts` only ever reads `code` + `next` from the URL and calls
      `exchangeCodeForSession(code)` — nothing in it branches on *how* the code was produced. `next` is
      already passed through `safeNextPath()` and included in the redirect, so
      `resetPasswordForEmail(email, { redirectTo: '${origin}/auth/callback?next=/reset-password' })`
      needs **zero changes** to this route — it already does exactly what Google's flow does, just with
      a different `next` value. This is a real code-level confirmation of the claim, not a live-project
      one; say so plainly rather than overclaiming "verified."
- [x] `src/lib/supabase/client.ts`: `createBrowserClient` now explicitly passes
      `{ auth: { flowType: 'pkce' } }` instead of relying on the library's default.
- [x] Gates clean (`lint`). Commit.

### Task 2: `AuthContext.tsx` and pure validation
- [x] Added `signUpWithEmail`/`signInWithEmail`/`requestPasswordReset`/`updatePassword` per Contracts.
      Errors surface as Supabase's own short `error.code` (e.g. `user_already_exists`,
      `email_not_confirmed`, `invalid_credentials`) rather than its English `message`, so the screen can
      localise them; an unrecognised/missing code falls back to a generic `*_failed` code per method.
- [x] Decided **inline, no separate module**: the only real logic is an email-format check (reusing
      `src/lib/validation.ts`'s existing `@`-and-dot regex pattern, not inventing a second one) and
      "do the two password fields match" — two one-line checks, not enough real logic to justify a
      module + test file over just writing them directly in the sign-up/reset-password screens (Task 3).
- [x] Gates clean (`lint`, 223 tests). Commit.

### Task 3: Screens
- [x] New `ScreenId`s/`SCREEN_PATHS` entries (`sign-in`, `forgot-password`, `reset-password`); page.tsx
      wrappers under `src/app/[lang]/...` per this project's thin-wrapper convention. `requiredAccess()`
      needed no changes, confirmed — these paths aren't in `PROTECTED_PATHS`, so they're open to
      everyone, same as the emergency screens.
- [x] `SignInScreen.tsx`: email+password sign-in with a toggle to a sign-up form (name is not collected
      — `Profile.name`, if ever wanted, already comes from `user_metadata` the same way Google's does),
      "Forgot password?" link, the Google button moved in from `AuthButton.tsx`. Already-signed-in people
      land back on `next` (read from `?next=`, validated with the existing `safeNextPath()`) instead of
      seeing the form again. `signUp`'s "needs email confirmation" case shows a real "check your email"
      panel instead of silently doing nothing.
- [x] `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx` per Contracts, including the
      no-valid-recovery-session explanatory state on the latter (a plain `!user` check after loading —
      deliberately not trying to detect Supabase's `PASSWORD_RECOVERY` event specifically, since that
      would need live-project verification this sandbox can't do anyway; the simpler check matches what
      the plan already called for).
- [x] `AuthButton.tsx`: "Sign in" now navigates to the `sign-in` screen (needed an `onNavigate` prop it
      didn't have before — threaded through from `Header.tsx`, which already had one); sign-out stays as
      it is. Also fixed `header.signIn`'s label ("Sign in with Google" → "Sign in") since the button no
      longer only offers Google.
- [x] Locale strings (`en`/`bn`, new `auth.ts` namespace registered in both aggregators). Found and fixed
      a stale hardcoded count in `src/utils/routes.test.ts` (`SCREEN_PATHS` went from 10 to 13 entries).
      Gates clean (`lint`, 223 tests, `build`). Browser-checked without a real Supabase project (no
      Supabase env vars in this sandbox, same as every other check in this repo): all three new pages
      render an empty `<main>` — the demo-mode fallback hides the forms exactly like it hides the Google
      button today, no broken state, no console errors. The signed-in flows themselves (actually
      completing a sign-up, confirming an email, resetting a password) cannot be verified without a real
      Supabase project — not checked, said so plainly, same limitation as Task 1 and as Google sign-in
      elsewhere in this repo.
- [x] Commit.

### Task 4: Setup documentation
- [x] `docs/SETUP-SUPABASE.md`: new "6a. Turn on email + password sign-in" section next to the Google
      one — enabling the Email provider, confirming the Confirm-signup/Reset-password templates and the
      redirect-URL allowlist already cover it (same `/auth/callback` route as Google, nothing new to
      add), the "Confirm email" toggle, the honest note that this couldn't be verified against a real
      project. Updated the top summary table, the opening "Sign-in uses Supabase Auth" line, and added
      three email-auth troubleshooting rows.
- [x] Commit.

### Task 5: Documentation
- [x] `docs/HANDOFF.md` progress log (including plainly what could and couldn't be verified without a
      real Supabase project); `docs/SPEC-MATCH-PLAN.md` module table ("Secure authentication" row),
      WP10 section, milestone table (M4), realistic match ~90% → ~97%.
- [x] Tick every box above. Final commit.
