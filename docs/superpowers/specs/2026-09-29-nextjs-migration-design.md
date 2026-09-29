# Blood Lagbe: Vite to Next.js Migration Design

Date: 2026-09-29

## Goal

Convert the Vite + React 19 SPA to Next.js (App Router) with identical UI and behavior. Each screen that is currently selected by `window.location.hash` becomes a real route. No new features.

## Current State

- Vite + React 19, Tailwind 4, about 10k lines, 16 components in `src/components`.
- No router. `src/App.tsx` holds `currentScreen` state and syncs it with `window.location.hash`.
- All state is client-side: `useState` in `App.tsx` (demands, donors, notifications, selected division, audio mute, toast, requisition modal, OTP modal) plus `LanguageContext` and `AlertContext`, both persisting to `localStorage`.
- Data comes from `src/data/mockData.ts`. No real backend calls.
- `express`, `@google/genai`, `dotenv` are in `package.json` but unused in `src`.

## Decisions

- App Router, `src/app` directory.
- Real routes; shared state lives in client providers mounted in the root layout so it survives navigation.
- Mock data stays. No API routes, no SSR data fetching.
- Old hash URLs keep working through a client-side redirect.

## Design

### 1. Structure

Existing folders (`components`, `context`, `data`, `types`, `utils`) stay under `src` so imports remain valid.

- `src/app/layout.tsx` (server component): metadata, fonts, `globals.css` (moved from `src/index.css`), wraps children in `<Providers>` and the app shell.
- `src/app/providers.tsx` (`'use client'`): `LanguageProvider`, `AlertProvider`, `AppStateProvider`.
- `src/context/AppStateContext.tsx` (new, `'use client'`): state moved out of `App.tsx`: demands, donors, notifications, notifications-open flag, selected division, audio mute, toast, requisition modal, OTP modal, plus the handlers (`handleSosCreated`, `handleOpenRequisition`, audio toggle, etc.). Exposed via `useAppState()`.
- App shell (client component, rendered from layout): `Header`, `Footer`, `NotificationsModal`, `RequisitionModal`, `OtpVerificationModal`, toast. Replaces the shell part of `App.tsx`.
- Routes, one `page.tsx` each:

| Route | Screen (`ScreenId`) |
|---|---|
| `/` | emergency-hub |
| `/donors` | donor-directory |
| `/sos` | create-sos |
| `/tracking` | request-tracking |
| `/register` | donor-register |
| `/tracker` | live-tracker |
| `/hospitals` | hospital-org |
| `/passport` | donor-passport |
| `/command` | ops-command |
| `/deck` | pitch-deck |
| `/admin` | admin-panel |

- Each `page.tsx` is thin: renders the screen component, which reads what it needs from `useAppState()` instead of props from `App.tsx`. Screen components get `'use client'`.
- `src/App.tsx` and `src/main.tsx` are deleted once their content is moved.

### 2. Navigation

- One `ScreenId -> path` map (`src/utils/routes.ts`) is the single source of truth.
- `handleNavigate(screen)` becomes `router.push(path)` plus the existing smooth scroll to top. Header and Footer links use `next/link` where they are plain links.
- Legacy hash redirect: a small client component in the layout reads `window.location.hash` on mount, maps the old aliases (`admin`, `admin-panel`, `donors`, `sos`, `tracking`, `requests`, `register`, `tracker`, `hospitals`, `orgs`, `passport`, `command`, `deck`, `proposal`, `emergency`, etc., same alias list as `getScreenFromHash`) to the new path and calls `router.replace`.

### 3. Client-only code

- `localStorage` access in `LanguageContext` and `AlertContext` moves to `useEffect` (or a guarded lazy init) so server render and first client render match. No hydration warnings.
- `window`, `utils/audio.ts` and `motion` usage stay inside client components only.

### 4. Tooling

- Remove: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `express`, `dotenv`, `@google/genai`, `@types/express`, `esbuild`, `tsx`, `autoprefixer` (only if unused after migration), `index.html`, `vite.config.ts`.
- Add: `next`, `@tailwindcss/postcss`, `postcss.config.mjs`, `next.config.ts`.
- Keep: `react`, `react-dom`, `motion`, `lucide-react`, `tailwindcss`, `typescript`, type packages.
- Scripts: `dev`, `build`, `start`, `lint` (`tsc --noEmit`).
- `tsconfig.json`: Next plugin, `@/*` maps to `src/*`.
- `.env.example`: variables are unused by the app; leave for now, note in README/plan if removed.
- Exact Next.js version and Tailwind 4 PostCSS setup are verified against current docs during planning.

### 5. Verification

- `next build` succeeds.
- `tsc --noEmit` passes.
- Every route loads in the browser.
- State survives navigation: create an SOS on `/sos`, see it on `/`; register a donor, see it in `/donors`.
- Language and alert settings persist across reload.
- Old hash URLs (for example `/#admin`) redirect to `/admin`.
- No hydration warnings in the console.

## Out of Scope

New features, real backend or API routes, SSR data fetching, automated tests (the repo has none).

## Risks

- Prop drilling in `App.tsx` is broad. Moving to context touches every screen's props; do it screen by screen and type-check after each.
- SSR/hydration mismatch from `localStorage` and `window`. Mitigated by section 3.
