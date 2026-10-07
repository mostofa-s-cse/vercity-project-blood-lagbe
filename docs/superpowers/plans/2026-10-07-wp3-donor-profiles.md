# WP3: Donor and Blood Seeker roles, profiles

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** A donor can see and edit their own profile (availability, last donation date, contact,
vehicle, nearest hospital) whether they registered signed in or anonymously, and cannot touch
anyone else's. "Blood Seeker" is not a separate account type — every signed-in or signed-out
person can already post an SOS and search donors (M1); this package is about donor **ownership**
of a profile, mirroring the manage-token pattern M1 already built for requests.

**Decisions (already made, see conversation):**
- Donor registration stays open to signed-out people (no forced account, emergencies/accessibility).
- Signed-in registration auto-links the donor to the account (`userId`, already a column).
- Signed-out registration gets a one-time **manage token** (same pattern as SOS requests).
- Availability (`isAvailable`) stays a **manual** toggle in this package. Automatic eligibility from
  `lastDonationAt + 90 days` is WP5's job (it also adds the real `lastDonationAt` field) — not
  duplicated here.

## Contracts

### Schema (migration `0007_donor_manage_token`)
- `Donor.manageTokenHash String? @map("manage_token_hash")` — same shape as `SosRequest.manageTokenHash`.

### Endpoints
| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/donors` (exists) | unchanged + now always returns a manage token | 201 `{ id, manageToken }` | 400, 503 |
| `PATCH /api/donors/[id]` | `{ name?, area?, division?, age?, gender?, vehicle?, nearestHospital?, isAvailable?, lastDonationMonths? }` | 200 `{ donor: DonorDto }` | 400, 401/403 (not the token/owner/`panel.donors`), 404, 503 |
| `GET /api/donors?mine=1` (extend existing query) | — | donors linked to the signed-in person's `userId` | 401 if not signed in |

### Who may edit a donor profile
Same triad as requests: the manage-token holder (`X-Manage-Token` header), the signed-in owner
(`userId`), or an admin-panel user with `panel.donors`.

## Tasks

### Task 1: Schema and manage token on registration
- [x] `prisma/schema.prisma`: add `manageTokenHash` to `Donor`. Migration `0007_donor_manage_token` (hand-written).
- [x] Verify on `.dev-db`: apply, `prisma migrate diff` empty.
- [x] `POST /api/donors`: generate a manage token, store the hash, return it; links `userId` when signed in (already did, unchanged); also added `mine=1` to `GET /api/donors` (401 if not signed in, same pattern as requests).
- [x] `src/lib/myDonorProfile.ts` (mirrors `myRequests.ts`): localStorage `{ id, token }` list, capped, tolerant of blocked storage. 8 tests with an in-memory `Storage` stand-in.
- [x] Commit.

### Task 2: Validation and the PATCH endpoint
- [x] `src/lib/validation.ts`: `parseDonorUpdateInput` (failing tests first, 3 tests) — every field optional, same bounds as `parseDonorInput` where they overlap, rejects an empty body (nothing to update).
- [x] `src/lib/donorAccess.ts` (mirrors `src/lib/requestAccess.ts`): `canManageDonor(row, headers)` — token, owner, or `panel.donors`.
- [x] `PATCH /api/donors/[id]`: authorise (401 no credentials / 403 wrong credentials, same rule as the requests PATCH), validate, update, return the DTO.
- [x] Database checks on `.dev-db` (curl, real Postgres): creator token 200 (and the change persisted — `isAvailable` really flipped), no token 401, another donor's token 403, unknown id 404, empty body 400, `mine=1` without sign-in 401. (Signed-in owner / `panel.donors` paths need a real Supabase session, same documented gap as the dashboards work — not re-tested here.)
- [x] Commit.

### Task 3: RTK Query and "My Profile"
- [x] `src/store/api.ts`: `getDonor` query and `updateDonor` mutation (invalidates `Donor`), token header same pattern as `updateRequestStatus` (new `getDonorToken` option, defaults to `myDonorProfile.ts`). Also added `GET /api/donors/[id]` (public, `DonorDto` only) to back `getDonor`.
- [x] `DonorRegistrationScreen.tsx`: a returning visitor (browser has a `myDonorProfile` entry) sees a "My Profile" panel instead of the blank form — real donor card, Available Now toggle, last-donation months, Save (via `updateDonor`), "Register someone else" to dismiss for this visit. A fresh registration now remembers its id+token via `rememberDonor`.
- [x] No database: the panel shows the same demo notice style (`isDatabaseOff`) as everywhere else.
- [x] Locale strings (en/bn, `register.ts`), gates, browser check (Playwright against `.dev-db`, fresh registration → reload → edit → save → confirmed in the database), commit.
- Found and fixed along the way: a transient React hydration console error (#418) traced to Playwright's browser disk cache serving a stale JS chunk across repeated server restarts on the same port in this sandbox, not a real bug — confirmed clean on a fresh origin/port with the exact same code and real data. Also simplified `MyDonorProfilePanel` to plain string ids instead of `useId()` (it only ever mounts once per page, so `useId()` added nothing).

### Task 4: Documentation
- [x] `docs/HANDOFF.md` progress log, `docs/SPEC-MATCH-PLAN.md` module table (row 1) and WP3 status.
- [x] Tick every box above. Final commit.
