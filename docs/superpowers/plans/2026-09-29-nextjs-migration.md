# Blood Lagbe Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Vite + React 19 SPA to Next.js App Router with identical UI and behavior, one real route per screen.

**Architecture:** Shared app state moves out of `src/App.tsx` into `AppStateProvider` (client context) mounted in the root layout via `Providers`. An `AppShell` client component renders Header/Footer/modals/toast around `children`. Each screen gets a thin client `page.tsx` that reads `useAppState()` and passes the same props the screen already takes, so screen component files stay unchanged. Route mapping is one pure module (`src/utils/routes.ts`), unit-tested with `node:test`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4 via `@tailwindcss/postcss`, TypeScript, `motion`, `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-09-29-nextjs-migration-design.md`

**Deviations from spec (deliberate, behavior-neutral):**
- Screens keep their existing props; `page.tsx` wrappers supply them from `useAppState()`. Screen files are not edited. Reason: 11 fewer edited files, lower regression risk. The spec's "screen reads `useAppState()`" is satisfied one level up.
- Spec verification line "create an SOS on `/sos`, see it on `/`" is wrong for current code: `App.tsx` `demands` state is never passed to `EmergencyHub`. Migration preserves that. Verify toast + notification instead.
- Header/Footer/Notifications navigate with buttons (`onNavigate`), not `<a>` links, so `next/link` conversion does not apply. They call `router.push` via `navigate`.

## Global Constraints

- App Router, `src/app` directory. Next.js `^16.2.9`.
- Keep `src/components`, `src/context`, `src/data`, `src/types`, `src/utils` in place; existing relative imports stay valid.
- No new features, no API routes, no SSR data fetching.
- Mock data stays in `src/data/mockData.ts`.
- Remove `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `express`, `dotenv`, `@google/genai`, `@types/express`, `esbuild`, `tsx`, `autoprefixer`, `index.html`, `vite.config.ts`, `src/App.tsx`, `src/main.tsx`.
- Add `next`, `@tailwindcss/postcss`, `postcss.config.mjs`, `next.config.ts`.
- Scripts: `dev`, `build`, `start`, `lint` (`tsc --noEmit`), plus `test` (`node --test`).
- `tsconfig.json`: Next plugin, `@/*` maps to `./src/*`, keep non-strict (as today).
- Legacy hash redirect uses the same alias list as old `getScreenFromHash`.
- `localStorage` and `window` only touched in effects or event handlers (no SSR/hydration mismatch).

## Review Focus

1. Hash like `#constructor`, `#toString`, empty, `#`-only, uppercase (`#ADMIN`): must not crash or redirect wrongly; only known aliases redirect. (Task 1 tests)
2. Deep link with hash on a non-root path (`/admin#sos`): must not redirect. (Task 1 tests)
3. Pathname edge cases: trailing slash (`/donors/`), `null`, unknown path, prototype key (`/constructor`): map to a screen without crashing. (Task 1 tests)
4. Corrupt `localStorage` (`blood_lagbe_critical_alert` = `{bad`, `blood_lagbe_lang` = `xx`): app loads with defaults, no crash. (Task 6 browser check)
5. Direct load/refresh on `/admin`: dark admin shell in server HTML, no Header flash; direct load on any route shows header. (Task 5 curl check, Task 6 browser check)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/utils/routes.ts` (new) | `SCREEN_PATHS`, `pathToScreen`, `resolveLegacyRedirect`. Pure, no React. |
| `src/utils/routes.test.ts` (new) | `node:test` unit tests for routes.ts. |
| `src/context/AppStateContext.tsx` (new) | All state and handlers moved from `App.tsx`; `AppStateProvider`, `useAppState`. |
| `src/context/LanguageContext.tsx` (edit) | SSR-safe `localStorage` load. |
| `src/context/AlertContext.tsx` (edit) | SSR-safe `localStorage` load. |
| `src/components/AppShell.tsx` (new) | Toast, Header, Footer, modals, admin vs normal shell. |
| `src/components/LegacyHashRedirect.tsx` (new) | Client redirect from old `#hash` URLs. |
| `src/app/layout.tsx` (new) | Root layout, metadata, font links, `globals.css`. |
| `src/app/providers.tsx` (new) | Provider stack + redirect + shell. |
| `src/app/globals.css` (moved from `src/index.css`) | Global styles. |
| `src/app/page.tsx` + 10 route `page.tsx` files | Thin screen wrappers. |
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore` | Tooling. |

---

### Task 1: Route mapping module with tests

**Files:**
- Create: `src/utils/routes.ts`
- Create: `src/utils/routes.test.ts`
- Modify: `tsconfig.json` (add `node` to `types` so `tsc` accepts the test file while still on Vite)
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces:
  - `SCREEN_PATHS: Record<ScreenId, string>`
  - `pathToScreen(pathname: string | null | undefined): ScreenId`
  - `resolveLegacyRedirect(pathname: string, hash: string): string | null`

- [ ] **Step 1: Write the failing test**

Create `src/utils/routes.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_PATHS, pathToScreen, resolveLegacyRedirect } from './routes.ts';

test('SCREEN_PATHS covers every screen with a unique path', () => {
  const paths = Object.values(SCREEN_PATHS);
  assert.equal(paths.length, 11);
  assert.equal(new Set(paths).size, 11);
  assert.equal(SCREEN_PATHS['emergency-hub'], '/');
  assert.equal(SCREEN_PATHS['admin-panel'], '/admin');
});

test('pathToScreen round-trips every screen', () => {
  for (const [screen, path] of Object.entries(SCREEN_PATHS)) {
    assert.equal(pathToScreen(path), screen);
  }
});

test('pathToScreen tolerates trailing slash, null, unknown and prototype keys', () => {
  assert.equal(pathToScreen('/donors/'), 'donor-directory');
  assert.equal(pathToScreen(null), 'emergency-hub');
  assert.equal(pathToScreen(undefined), 'emergency-hub');
  assert.equal(pathToScreen('/nope'), 'emergency-hub');
  assert.equal(pathToScreen('/constructor'), 'emergency-hub');
  assert.equal(pathToScreen('/__proto__'), 'emergency-hub');
});

test('resolveLegacyRedirect maps every old alias from root', () => {
  const cases: Record<string, string> = {
    admin: '/admin',
    'admin-panel': '/admin',
    donors: '/donors',
    'donor-directory': '/donors',
    sos: '/sos',
    'create-sos': '/sos',
    tracking: '/tracking',
    requests: '/tracking',
    'request-tracking': '/tracking',
    register: '/register',
    'donor-register': '/register',
    tracker: '/tracker',
    'live-tracker': '/tracker',
    hospitals: '/hospitals',
    orgs: '/hospitals',
    'hospital-org': '/hospitals',
    passport: '/passport',
    'donor-passport': '/passport',
    command: '/command',
    'ops-command': '/command',
    deck: '/deck',
    proposal: '/deck',
    'pitch-deck': '/deck',
    emergency: '/',
    'emergency-hub': '/',
  };
  for (const [alias, target] of Object.entries(cases)) {
    assert.equal(resolveLegacyRedirect('/', `#${alias}`), target, alias);
  }
});

test('resolveLegacyRedirect is case-insensitive and trims', () => {
  assert.equal(resolveLegacyRedirect('/', '#ADMIN'), '/admin');
  assert.equal(resolveLegacyRedirect('/', '# Donors '), '/donors');
  assert.equal(resolveLegacyRedirect('/', 'sos'), '/sos');
});

test('resolveLegacyRedirect ignores unknown, empty and prototype hashes', () => {
  assert.equal(resolveLegacyRedirect('/', ''), null);
  assert.equal(resolveLegacyRedirect('/', '#'), null);
  assert.equal(resolveLegacyRedirect('/', '#nope'), null);
  assert.equal(resolveLegacyRedirect('/', '#constructor'), null);
  assert.equal(resolveLegacyRedirect('/', '#toString'), null);
  assert.equal(resolveLegacyRedirect('/', '#__proto__'), null);
});

test('resolveLegacyRedirect never redirects from a non-root path', () => {
  assert.equal(resolveLegacyRedirect('/admin', '#sos'), null);
  assert.equal(resolveLegacyRedirect('/donors', '#admin'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/iqbal/Project/vercity-project-blood-lagbe && node --test src/utils/routes.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `./routes.ts`).

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/routes.ts`:

```ts
import type { ScreenId } from '../types/blood';

export const SCREEN_PATHS: Record<ScreenId, string> = {
  'emergency-hub': '/',
  'donor-directory': '/donors',
  'create-sos': '/sos',
  'request-tracking': '/tracking',
  'donor-register': '/register',
  'live-tracker': '/tracker',
  'hospital-org': '/hospitals',
  'donor-passport': '/passport',
  'ops-command': '/command',
  'pitch-deck': '/deck',
  'admin-panel': '/admin',
};

const PATH_TO_SCREEN: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen as ScreenId])
);

export function pathToScreen(pathname: string | null | undefined): ScreenId {
  if (!pathname) return 'emergency-hub';
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return Object.hasOwn(PATH_TO_SCREEN, normalized) ? PATH_TO_SCREEN[normalized] : 'emergency-hub';
}

// Same alias list as the old getScreenFromHash in App.tsx.
const LEGACY_HASH_ALIASES: Record<string, ScreenId> = {
  admin: 'admin-panel',
  'admin-panel': 'admin-panel',
  donors: 'donor-directory',
  'donor-directory': 'donor-directory',
  sos: 'create-sos',
  'create-sos': 'create-sos',
  tracking: 'request-tracking',
  requests: 'request-tracking',
  'request-tracking': 'request-tracking',
  register: 'donor-register',
  'donor-register': 'donor-register',
  tracker: 'live-tracker',
  'live-tracker': 'live-tracker',
  hospitals: 'hospital-org',
  orgs: 'hospital-org',
  'hospital-org': 'hospital-org',
  passport: 'donor-passport',
  'donor-passport': 'donor-passport',
  command: 'ops-command',
  'ops-command': 'ops-command',
  deck: 'pitch-deck',
  proposal: 'pitch-deck',
  'pitch-deck': 'pitch-deck',
  emergency: 'emergency-hub',
  'emergency-hub': 'emergency-hub',
};

/** Path to redirect an old `/#alias` URL to, or null when no redirect applies. */
export function resolveLegacyRedirect(pathname: string, hash: string): string | null {
  if (pathname !== '/') return null;
  const key = hash.toLowerCase().replace('#', '').trim();
  if (!Object.hasOwn(LEGACY_HASH_ALIASES, key)) return null;
  return SCREEN_PATHS[LEGACY_HASH_ALIASES[key]];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/utils/routes.test.ts`
Expected: all 7 tests PASS, 0 failures.

- [ ] **Step 5: Add test script and let tsc accept the test file**

In `package.json` scripts add `"test": "node --test src/utils/routes.test.ts"`.
In `tsconfig.json` change `"types": ["vite/client"]` to `"types": ["vite/client", "node"]`.

- [ ] **Step 6: Commit**

```bash
git add src/utils/routes.ts src/utils/routes.test.ts package.json tsconfig.json
git commit -m "feat: add route mapping module with tests"
```

---

### Task 2: SSR-safe language and alert contexts

**Files:**
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/context/AlertContext.tsx:61-85` (the two `useState` initializers)

**Interfaces:**
- Consumes/Produces: unchanged public API (`useLanguage`, `useAlert`, `LanguageProvider`, `AlertProvider`). Only initial-state behavior changes: first render uses defaults, saved values load in a mount effect.

- [ ] **Step 1: Install deps so tsc runs**

Run: `npm install`
Expected: installs without error (still Vite-era `package.json`; creates `package-lock.json`).

- [ ] **Step 2: Baseline type check**

Run: `npx tsc --noEmit`
Expected: no errors. If there are pre-existing errors, record them and only make sure none are added later.

- [ ] **Step 3: Rewrite `LanguageContext.tsx`**

Replace the `LanguageProvider` body (from `export const LanguageProvider` through the closing `};` before `useLanguage`) with:

```tsx
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Bengali. Saved choice loads after mount so server and first client render match.
  const [language, setLanguageState] = useState<Language>('bn');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('blood_lagbe_lang');
      if (saved === 'en' || saved === 'bn') setLanguageState(saved);
    } catch (e) {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('blood_lagbe_lang', lang);
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const next = language === 'bn' ? 'en' : 'bn';
    setLanguage(next);
  };

  const t = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

- [ ] **Step 4: Edit `AlertContext.tsx` initializers**

Replace both `useState(() => { ... })` initializer blocks (the `criticalAlert` and `emergencyRadius` ones) with:

```tsx
  const [criticalAlert, setCriticalAlert] = useState<CriticalAlertConfig>(DEFAULT_ALERT);
  const [emergencyRadius, setEmergencyRadius] = useState<EmergencyRadiusConfig>(DEFAULT_RADIUS);

  // Load saved config after mount so server and first client render match.
  useEffect(() => {
    try {
      const savedAlert = localStorage.getItem('blood_lagbe_critical_alert');
      if (savedAlert) setCriticalAlert(JSON.parse(savedAlert));
    } catch (e) {
      console.error('Error loading critical alert', e);
    }
    try {
      const savedRadius = localStorage.getItem('blood_lagbe_emergency_radius');
      if (savedRadius) setEmergencyRadius(JSON.parse(savedRadius));
    } catch (e) {
      console.error('Error loading emergency radius', e);
    }
  }, []);
```

Leave `updateCriticalAlert`, `updateEmergencyRadius`, `resetAlertDefaults`, and any existing `useEffect` in the file untouched.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: same result as Step 2 (no new errors).

- [ ] **Step 6: Commit**

```bash
git add src/context/LanguageContext.tsx src/context/AlertContext.tsx package-lock.json
git commit -m "refactor: load localStorage in effects for SSR safety"
```

---

### Task 3: AppStateContext

**Files:**
- Create: `src/context/AppStateContext.tsx`

**Interfaces:**
- Consumes: `useLanguage()` (`language`), `sound` from `../utils/audio`, `SCREEN_PATHS`/`pathToScreen` from `../utils/routes`, `next/navigation` (`useRouter`, `usePathname`), mock data + types.
- Produces: `AppStateProvider`, `useAppState(): AppStateValue` with exactly:

```ts
interface AppStateValue {
  currentScreen: ScreenId;
  navigate: (screen: ScreenId) => void;
  selectedDivision: string;
  setSelectedDivision: (div: string) => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  demands: EmergencyDemand[];
  donors: Donor[];
  notifications: DonorNotification[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  toastMessage: string | null;
  dismissToast: () => void;
  requisitionModal: RequisitionModalState;
  openRequisition: (demand: any) => void;
  closeRequisition: () => void;
  otpModal: { isOpen: boolean; mission: ActiveMission };
  openOtpModal: (mission: ActiveMission) => void;
  closeOtpModal: () => void;
  handleOtpSuccess: () => void;
  handleSosCreated: (newDemand: EmergencyDemand) => void;
  handleRegisterDonor: (newDonor: Donor) => void;
}
```

- [ ] **Step 1: Install Next so the imports resolve**

Run: `npm install next@^16.2.9`
Expected: installs. (Full tooling swap happens in Task 4; this only makes `next/navigation` types available for type-checking now.)

- [ ] **Step 2: Create the file**

Create `src/context/AppStateContext.tsx`. Handler bodies are copied verbatim from `src/App.tsx`.

```tsx
'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenId, EmergencyDemand, ActiveMission, Donor, DonorNotification } from '../types/blood';
import { INITIAL_DEMANDS, ACTIVE_MISSION_DEFAULT, INITIAL_DONORS, INITIAL_NOTIFICATIONS } from '../data/mockData';
import { sound } from '../utils/audio';
import { SCREEN_PATHS, pathToScreen } from '../utils/routes';
import { useLanguage } from './LanguageContext';

interface RequisitionModalState {
  isOpen: boolean;
  patientName?: string;
  hospitalName?: string;
  doctorName?: string;
  bloodGroup?: string;
  units?: number;
}

interface OtpModalState {
  isOpen: boolean;
  mission: ActiveMission;
}

interface AppStateValue {
  currentScreen: ScreenId;
  navigate: (screen: ScreenId) => void;
  selectedDivision: string;
  setSelectedDivision: (div: string) => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  demands: EmergencyDemand[];
  donors: Donor[];
  notifications: DonorNotification[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  toastMessage: string | null;
  dismissToast: () => void;
  requisitionModal: RequisitionModalState;
  openRequisition: (demand: any) => void;
  closeRequisition: () => void;
  otpModal: OtpModalState;
  openOtpModal: (mission: ActiveMission) => void;
  closeOtpModal: () => void;
  handleOtpSuccess: () => void;
  handleSosCreated: (newDemand: EmergencyDemand) => void;
  handleRegisterDonor: (newDonor: Donor) => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentScreen = pathToScreen(pathname);
  const { language } = useLanguage();

  const [selectedDivision, setSelectedDivision] = useState<string>('Dhaka Central');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [demands, setDemands] = useState<EmergencyDemand[]>(INITIAL_DEMANDS);
  const [donors, setDonors] = useState<Donor[]>(INITIAL_DONORS);
  const [notifications, setNotifications] = useState<DonorNotification[]>(INITIAL_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [requisitionModal, setRequisitionModal] = useState<RequisitionModalState>({ isOpen: false });
  const [otpModal, setOtpModal] = useState<OtpModalState>({
    isOpen: false,
    mission: ACTIVE_MISSION_DEFAULT,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navigate = useCallback(
    (screen: ScreenId) => {
      router.push(SCREEN_PATHS[screen]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const toggleAudioMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const openRequisition = (demand: any) => {
    sound.playTap();
    setRequisitionModal({
      isOpen: true,
      patientName: demand.patientName,
      hospitalName: demand.hospital,
      doctorName: demand.doctorName || 'Dr. Ashfaqul Alam, MD (Registrar)',
      bloodGroup: demand.bloodGroup,
      units: demand.bagsRequired,
    });
  };

  const handleSosCreated = (newDemand: EmergencyDemand) => {
    setDemands((prev) => [newDemand, ...prev]);

    // Also trigger an emergency notification in the system
    const newNotif: DonorNotification = {
      id: `NOTIF-${Date.now().toString().slice(-4)}`,
      title: `🚨 জরুরি ${newDemand.bloodGroup} রক্তের এসওএস ব্রডকাস্ট!`,
      message: `${newDemand.hospital}-এ ${newDemand.bagsRequired} ব্যাগ ${newDemand.bloodGroup} রক্ত প্রয়োজন। রোগী: ${newDemand.patientName}`,
      timestamp: 'এইমাত্র',
      type: 'urgent_request',
      read: false,
      bloodGroup: newDemand.bloodGroup,
      hospital: newDemand.hospital,
      distanceKm: newDemand.distanceKm || 1.8,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(
      language === 'bn'
        ? `জরুরি ব্রডকাস্ট চালু: ${newDemand.hospital}-এর কাছাকাছি ৪৫০+ রক্তদাতার কাছে ${newDemand.bloodGroup} রক্তের এসওএস পাঠানো হয়েছে।`
        : `Broadcast Active: ${newDemand.bloodGroup} SOS dispatched to 450+ donors near ${newDemand.hospital}.`
    );
  };

  const handleRegisterDonor = (newDonor: Donor) => {
    setDonors((prev) => [newDonor, ...prev]);
    showToast(
      language === 'bn'
        ? `স্বাগতম ${newDonor.name}! আপনার ${newDonor.bloodGroup} রক্তদাতা প্রোফাইল সক্রিয় করা হয়েছে।`
        : `Welcome ${newDonor.name}! Your ${newDonor.bloodGroup} profile is now active on the donor roster.`
    );
  };

  const openOtpModal = (mission: ActiveMission) => {
    setOtpModal({ isOpen: true, mission });
  };

  const handleOtpSuccess = () => {
    showToast(
      language === 'bn'
        ? 'রক্তদান সম্পন্ন ও নিশ্চিত করা হয়েছে! ডিজিটাল সনদ ও রসিদ রেকর্ড করা হলো।'
        : 'Transfusion Handshake Confirmed! Official digital blood exchange receipt recorded.'
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value: AppStateValue = {
    currentScreen,
    navigate,
    selectedDivision,
    setSelectedDivision,
    isAudioMuted,
    toggleAudioMute,
    demands,
    donors,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    isNotificationsOpen,
    openNotifications: () => setIsNotificationsOpen(true),
    closeNotifications: () => setIsNotificationsOpen(false),
    markNotificationRead,
    clearAllNotifications,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    requisitionModal,
    openRequisition,
    closeRequisition: () => setRequisitionModal({ isOpen: false }),
    otpModal,
    openOtpModal,
    closeOtpModal: () => setOtpModal((prev) => ({ ...prev, isOpen: false })),
    handleOtpSuccess,
    handleSosCreated,
    handleRegisterDonor,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors from `AppStateContext.tsx`. If `next/navigation` types are missing, confirm Step 1 installed `next`.

- [ ] **Step 4: Commit**

```bash
git add src/context/AppStateContext.tsx package.json package-lock.json
git commit -m "feat: add AppStateContext extracted from App"
```

---

### Task 4: Switch tooling to Next.js, shell, and the `/` route

**Files:**
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Create: `next.config.ts`, `postcss.config.mjs`
- Move: `src/index.css` to `src/app/globals.css`
- Create: `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/page.tsx`
- Create: `src/components/AppShell.tsx`, `src/components/LegacyHashRedirect.tsx`
- Delete: `index.html`, `vite.config.ts`, `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `useAppState()` (Task 3), `resolveLegacyRedirect` (Task 1), provider components.
- Produces: `Providers`, `AppShell`, `LegacyHashRedirect`; route `/` renders `EmergencyHub`.

- [ ] **Step 1: Replace `package.json`**

Overwrite `package.json`:

```json
{
  "name": "blood-lagbe",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000 --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "clean": "rm -rf .next",
    "lint": "tsc --noEmit",
    "test": "node --test src/utils/routes.test.ts"
  },
  "dependencies": {
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "next": "^16.2.9",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^7.0.2"
  }
}
```

- [ ] **Step 2: Reinstall and prune**

Run: `rm -rf node_modules package-lock.json && npm install`
Expected: installs cleanly, no `vite` in `node_modules`. If Next rejects `typescript@^7.0.2`, change it to `^5.9.0` and re-run, and note the change in the commit message.

- [ ] **Step 3: Overwrite `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "allowImportingTsExtensions": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Config files and gitignore**

Create `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

Append to `.gitignore`:

```
.next/
next-env.d.ts
```

- [ ] **Step 5: Move CSS**

Run: `mkdir -p src/app && git mv src/index.css src/app/globals.css`

- [ ] **Step 6: Create `src/components/LegacyHashRedirect.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { resolveLegacyRedirect } from '../utils/routes';

/** Sends old `/#admin`-style URLs to their real routes. */
export function LegacyHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const redirect = () => {
      const target = resolveLegacyRedirect(pathname, window.location.hash);
      if (target) router.replace(target);
    };
    redirect();
    window.addEventListener('hashchange', redirect);
    return () => window.removeEventListener('hashchange', redirect);
  }, [pathname, router]);

  return null;
}
```

- [ ] **Step 7: Create `src/components/AppShell.tsx`**

Markup is copied from the old `App.tsx`: dark shell without Header/Footer/OTP for admin, normal shell otherwise.

```tsx
'use client';

import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { NotificationsModal } from './NotificationsModal';
import { RequisitionModal } from './RequisitionModal';
import { OtpVerificationModal } from './OtpVerificationModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useAppState();
  const isAdmin = app.currentScreen === 'admin-panel';

  const toast = app.toastMessage && (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 max-w-md">
      <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
      <span className="text-xs font-semibold">{app.toastMessage}</span>
      <button onClick={app.dismissToast} className="text-slate-400 hover:text-white ml-auto cursor-pointer">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );

  const notificationsModal = (
    <NotificationsModal
      isOpen={app.isNotificationsOpen}
      onClose={app.closeNotifications}
      notifications={app.notifications}
      onMarkAsRead={app.markNotificationRead}
      onClearAll={app.clearAllNotifications}
      onNavigate={app.navigate}
    />
  );

  const requisitionModal = (
    <RequisitionModal
      isOpen={app.requisitionModal.isOpen}
      onClose={app.closeRequisition}
      patientName={app.requisitionModal.patientName}
      hospitalName={app.requisitionModal.hospitalName}
      doctorName={app.requisitionModal.doctorName}
      bloodGroup={app.requisitionModal.bloodGroup}
      units={app.requisitionModal.units}
    />
  );

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
        {toast}
        {children}
        {notificationsModal}
        {requisitionModal}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {toast}

      <Header
        currentScreen={app.currentScreen}
        onNavigate={app.navigate}
        selectedDivision={app.selectedDivision}
        onSelectDivision={app.setSelectedDivision}
        isAudioMuted={app.isAudioMuted}
        onToggleAudioMute={app.toggleAudioMute}
        unreadCount={app.unreadCount}
        onOpenNotifications={app.openNotifications}
      />

      <main className="flex-1 w-full">{children}</main>

      <Footer onNavigate={app.navigate} />

      {notificationsModal}
      {requisitionModal}

      <OtpVerificationModal
        isOpen={app.otpModal.isOpen}
        onClose={app.closeOtpModal}
        expectedOtp={app.otpModal.mission?.otpCode || '4921'}
        donorName={app.otpModal.mission?.donors[0]?.name || 'Tanvir Ahmed'}
        patientName={app.otpModal.mission?.patientName || 'Nahidul Islam'}
        onSuccess={app.handleOtpSuccess}
      />
    </div>
  );
}
```

- [ ] **Step 8: Create providers, layout, and `/` page**

`src/app/providers.tsx`:

```tsx
'use client';

import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { AlertProvider } from '../context/AlertContext';
import { AppStateProvider } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { LegacyHashRedirect } from '../components/LegacyHashRedirect';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AlertProvider>
        <AppStateProvider>
          <LegacyHashRedirect />
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </AlertProvider>
    </LanguageProvider>
  );
}
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

const TITLE = 'Blood Lagbe? (রক্ত লাগবে?) - Emergency Lifeline Network';
const DESCRIPTION =
  'Emergency Medical Lifeline Portal & Centralized Blood Rescue Network for Bangladesh. Real-time geo-matched donor broadcast, live telemetry tracker, and DGHS operations command.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
'use client';

import { EmergencyHub } from '@/components/EmergencyHub';
import { useAppState } from '@/context/AppStateContext';
import { sound } from '@/utils/audio';

export default function EmergencyHubPage() {
  const { navigate, openRequisition } = useAppState();
  return (
    <EmergencyHub
      onNavigate={navigate}
      onOpenRequisition={openRequisition}
      onSelectDonorCommit={() => {
        sound.playSuccessTone();
        navigate('live-tracker');
      }}
    />
  );
}
```

- [ ] **Step 9: Remove Vite files**

Run: `git rm index.html vite.config.ts src/App.tsx src/main.tsx`
Then confirm nothing still imports them: `grep -rn "App'\|main'\|index.css\|@/" src | grep -v "src/app/"`
Expected: no output.

- [ ] **Step 10: Type check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build succeeds and lists route `/`. Fix any error before continuing (`next build` may rewrite `tsconfig.json`; keep its additions).

- [ ] **Step 11: Run unit tests**

Run: `npm test`
Expected: 7 tests pass.

- [ ] **Step 12: Browser check of `/`**

Run `npm run dev` in the background, then open `http://localhost:3000/` with the Playwright browser tools. Confirm:
- Hub renders with header, footer, marquee, fonts and Material icons.
- Console has no hydration warning.
- Click the language toggle, reload, language persists.
- Open `http://localhost:3000/#admin`: it redirects to `/admin` (404 is expected until Task 5; the URL change is what matters).

Stop the dev server afterward.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: switch to Next.js App Router with shell and hub route"
```

---

### Task 5: Remaining ten routes

**Files (all new, all `'use client'` thin wrappers):**
- `src/app/donors/page.tsx`
- `src/app/sos/page.tsx`
- `src/app/tracking/page.tsx`
- `src/app/register/page.tsx`
- `src/app/tracker/page.tsx`
- `src/app/passport/page.tsx`
- `src/app/hospitals/page.tsx`
- `src/app/command/page.tsx`
- `src/app/deck/page.tsx`
- `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `useAppState()` fields `navigate`, `openRequisition`, `openOtpModal`, `donors`, `handleSosCreated`, `handleRegisterDonor`.

- [ ] **Step 1: Create the ten pages**

`src/app/donors/page.tsx`:

```tsx
'use client';

import { DonorDirectory } from '@/components/DonorDirectory';
import { useAppState } from '@/context/AppStateContext';

export default function DonorsPage() {
  const { navigate, donors } = useAppState();
  return <DonorDirectory onNavigate={navigate} donors={donors} />;
}
```

`src/app/sos/page.tsx`:

```tsx
'use client';

import { CreateSosScreen } from '@/components/CreateSosScreen';
import { useAppState } from '@/context/AppStateContext';

export default function SosPage() {
  const { navigate, handleSosCreated } = useAppState();
  return <CreateSosScreen onNavigate={navigate} onSosCreated={handleSosCreated} />;
}
```

`src/app/tracking/page.tsx`:

```tsx
'use client';

import { RequestTrackingScreen } from '@/components/RequestTrackingScreen';
import { useAppState } from '@/context/AppStateContext';

export default function TrackingPage() {
  const { navigate, openRequisition, openOtpModal } = useAppState();
  return (
    <RequestTrackingScreen
      onNavigate={navigate}
      onOpenRequisition={openRequisition}
      onOpenOtpModal={openOtpModal}
    />
  );
}
```

`src/app/register/page.tsx`:

```tsx
'use client';

import { DonorRegistrationScreen } from '@/components/DonorRegistrationScreen';
import { useAppState } from '@/context/AppStateContext';

export default function RegisterPage() {
  const { navigate, handleRegisterDonor } = useAppState();
  return <DonorRegistrationScreen onNavigate={navigate} onRegisterDonor={handleRegisterDonor} />;
}
```

`src/app/tracker/page.tsx`:

```tsx
'use client';

import { LiveTrackerScreen } from '@/components/LiveTrackerScreen';
import { useAppState } from '@/context/AppStateContext';

export default function TrackerPage() {
  const { navigate, openRequisition, openOtpModal } = useAppState();
  return (
    <LiveTrackerScreen
      onNavigate={navigate}
      onOpenRequisition={openRequisition}
      onOpenOtpModal={openOtpModal}
    />
  );
}
```

`src/app/passport/page.tsx`:

```tsx
'use client';

import { DonorPassportScreen } from '@/components/DonorPassportScreen';
import { useAppState } from '@/context/AppStateContext';

export default function PassportPage() {
  const { navigate } = useAppState();
  return <DonorPassportScreen onNavigate={navigate} />;
}
```

`src/app/hospitals/page.tsx`:

```tsx
'use client';

import { HospitalOrgScreen } from '@/components/HospitalOrgScreen';
import { useAppState } from '@/context/AppStateContext';

export default function HospitalsPage() {
  const { navigate, openRequisition } = useAppState();
  return <HospitalOrgScreen onNavigate={navigate} onOpenRequisition={openRequisition} />;
}
```

`src/app/command/page.tsx`:

```tsx
'use client';

import { OpsCommandScreen } from '@/components/OpsCommandScreen';
import { useAppState } from '@/context/AppStateContext';

export default function CommandPage() {
  const { navigate, openRequisition } = useAppState();
  return <OpsCommandScreen onNavigate={navigate} onOpenRequisition={openRequisition} />;
}
```

`src/app/deck/page.tsx`:

```tsx
'use client';

import { PitchDeckScreen } from '@/components/PitchDeckScreen';
import { useAppState } from '@/context/AppStateContext';

export default function DeckPage() {
  const { navigate } = useAppState();
  return <PitchDeckScreen onNavigate={navigate} />;
}
```

`src/app/admin/page.tsx`:

```tsx
'use client';

import { AdminPanelScreen } from '@/components/AdminPanelScreen';
import { useAppState } from '@/context/AppStateContext';

export default function AdminPage() {
  const { navigate, openRequisition } = useAppState();
  return <AdminPanelScreen onNavigate={navigate} onOpenRequisition={openRequisition} />;
}
```

- [ ] **Step 2: Type check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; build lists all 11 routes (`/`, `/admin`, `/command`, `/deck`, `/donors`, `/hospitals`, `/passport`, `/register`, `/sos`, `/tracker`, `/tracking`).

- [ ] **Step 3: Check every route responds, and admin SSR shell**

Run `npm run start` in the background (after the build), then:

```bash
for p in / /donors /sos /tracking /register /tracker /hospitals /passport /command /deck /admin; do
  printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$p"
done
curl -s http://localhost:3000/admin | grep -c "bg-slate-950"
curl -s http://localhost:3000/donors | grep -c "bg-slate-50"
```

Expected: all `200`; admin HTML count of `bg-slate-950` is at least 1; donors HTML count of `bg-slate-50` is at least 1. Stop the server afterward.

- [ ] **Step 4: Commit**

```bash
git add src/app
git commit -m "feat: add remaining screen routes"
```

---

### Task 6: End-to-end verification and cleanup

**Files:** none expected; fix anything the checks turn up in the file responsible.

- [ ] **Step 1: Navigation and shared state (browser)**

Run `npm run dev` in the background and use the Playwright browser tools:
- From `/`, click through every Header nav item; URL changes to the matching route each time and the active nav item highlights.
- `/register`: register a donor. The welcome toast appears. Go to `/donors`: the new donor is listed first. (State survived navigation.)
- `/sos`: create an SOS. The broadcast toast appears and the notifications badge count goes up; open the notifications drawer and see the new item. (The hub list not changing is existing behavior.)
- `/tracker` or `/tracking`: open the OTP modal and the requisition modal; both open and close.
- Browser back and forward buttons move between routes.

- [ ] **Step 2: Legacy hash URLs**

Open each of `http://localhost:3000/#admin`, `/#sos`, `/#deck`, `/#proposal`: each lands on the new route without a hash. Open `http://localhost:3000/admin#sos`: stays on `/admin`. Open `http://localhost:3000/#nope`: stays on `/`.

- [ ] **Step 3: Persistence and corrupt storage**

- Toggle language to English, reload: still English. Change an alert in `/admin`, reload: it persists.
- In the browser console run `localStorage.setItem('blood_lagbe_critical_alert','{bad'); localStorage.setItem('blood_lagbe_lang','xx')`, reload `/`: app loads with defaults (Bengali, default alert), no crash.

- [ ] **Step 4: Hydration and console**

On `/`, `/admin`, `/donors`, `/sos`: reload and read console messages. Expected: no "hydration" or "did not match" warnings and no uncaught errors. If a mismatch shows, find the value that differs between server and client (usually a `Date`/`Math.random`/`window` read during render) and move it into an effect.

- [ ] **Step 5: Final automated gates**

Run: `npm run lint && npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Leftover scan**

Run: `grep -rn "vite\|hashchange\|location.hash" src package.json tsconfig.json | grep -v "LegacyHashRedirect.tsx\|routes"`
Expected: no output. Also confirm `git status` shows no stray files (only `next-env.d.ts` and `.next/` ignored).

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address migration verification findings"
```

Skip this commit if the earlier steps needed no changes.

---

## Self-Review

- **Spec coverage:** structure (Tasks 3, 4, 5), routes table (Tasks 1, 5), navigation via `router.push` and legacy redirect (Tasks 1, 3, 4), client-only code (Task 2), tooling removal and additions (Task 4), verification list (Task 6). Spec's `next/link` mention and "screen reads `useAppState()`" are recorded as deviations at the top, with reasons. Spec's SOS-on-hub check is corrected.
- **Placeholders:** none. Every code step carries full code. Task 2 Step 4 names the two initializer blocks to replace and gives the exact replacement.
- **Type consistency:** `useAppState()` field names in Tasks 4 and 5 (`navigate`, `openRequisition`, `openOtpModal`, `closeOtpModal`, `handleOtpSuccess`, `handleSosCreated`, `handleRegisterDonor`, `markNotificationRead`, `clearAllNotifications`, `openNotifications`, `closeNotifications`, `toggleAudioMute`, `dismissToast`, `unreadCount`) match the interface in Task 3. `routes.ts` names match between Tasks 1, 3, 4.
- **Review Focus:** items 1-3 are unit tests in Task 1; item 4 is Task 6 Step 3; item 5 is Task 5 Step 3 and Task 6.
