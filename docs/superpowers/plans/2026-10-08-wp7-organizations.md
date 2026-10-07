# WP7: Hospital and organization accounts

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** Hospital/organization identity (name, licence, verification) becomes a real database table
instead of `SAMPLE_HOSPITAL_ORGS`, so new organizations can apply and an admin can really approve them
— closing the gap the dynamic-dashboards work (2026-10-06) flagged ("hospital identity/verification
stays sample"). Approval grants the built-in Hospital staff role tied to that organization, reusing
the grant system M1/earlier work already built — no new permission plumbing needed.

**Explicitly out of scope (say so, don't fake it):** linking a blood request to the specific
organization that posted it (`SosRequest.place` is free text, not a foreign key — matching by name
would be fragile and is not attempted here), so "organizations see and manage the requests addressed
to them" is not built. Cold-chain sensor readings and licence-document verification (e.g. an uploaded
PDF) also stay out of scope, same reasoning as the dashboards work.

## Contracts

### Schema (migration `0009_organizations`)
```prisma
model Organization {
  id              String   @id @default(cuid())
  name            String
  shortCode       String?  @map("short_code")
  type            String   // 'government_hospital' | 'private_hospital' | 'volunteer_org' | 'blood_bank' (src/types/blood.ts)
  division        String?
  district        String?
  address         String?
  hotline         String?
  emergencyContact String? @map("emergency_contact")
  directorName    String?  @map("director_name")
  licenseNumber   String?  @map("license_number")
  isVerified      Boolean  @default(false) @map("is_verified")
  status          String   @default("pending") @map("status") // 'pending' | 'approved' | 'rejected'
  totalBeds       Int?     @map("total_beds")
  icuBeds         Int?     @map("icu_beds")
  appliedBy       String?  @map("applied_by") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at")
  reviewedAt      DateTime? @map("reviewed_at")
  reviewedBy      String?  @map("reviewed_by")
  @@map("organizations")
}
```
`HospitalStock.hospitalId` keeps being a plain string key (no FK) — it already works for both the 6
sample ids and any new `Organization.id`, no change needed there.

### Endpoints
| Method and path | Notes |
|---|---|
| `GET /api/organizations` | Public. Every organization (approved and pending alike — the screens decide what to show); same exposure level as the rest of the hospital directory. |
| `POST /api/organizations/apply` | Public (signed in or not, same spirit as SOS/donor registration). Creates a `pending` organization. |
| `PATCH /api/admin/organizations/[id]` | `{ decision: 'approve' | 'reject' }`. Needs `panel.hospitals`. Approving sets `isVerified: true`, `status: 'approved'`, and grants the built-in Hospital staff role tied to this organization's id (reuses `src/lib/grantService.ts`, same as a manual grant in the Access tab) to the applicant's email if known. Rejecting just sets `status: 'rejected'`. Writes an `AuditLog` row either way. |

## Tasks

### Task 1: Schema and seed
- [x] `prisma/schema.prisma`: `Organization` model. Migration `0009_organizations` (hand-written).
- [x] Verify on `.dev-db`: apply, `prisma migrate diff` empty.
- [x] `prisma/seed.ts`: seed from `SAMPLE_HOSPITAL_ORGS` (fixed ids matching the existing `ORG-0x` ids so `HospitalStock` rows keep lining up), `status: 'approved'`, `isVerified: true`.
- [x] Commit.

### Task 2: Apply and list endpoints
- [ ] `src/lib/validation.ts`: `parseOrganizationApplyInput` (failing test first) — name, type (one of the 4), address, licenseNumber required; division/district/hotline/emergencyContact/directorName/totalBeds/icuBeds optional.
- [ ] `OrganizationDto` in `dtoTypes.ts`, `toOrganizationDto` in `dto.ts`.
- [ ] `GET /api/organizations`, `POST /api/organizations/apply`.
- [ ] Database checks on `.dev-db`: apply with a minimal body → `pending`, `isVerified: false`; invalid body → 400; list includes both seeded and newly-applied orgs.
- [ ] Commit.

### Task 3: Admin approve/reject
- [ ] `PATCH /api/admin/organizations/[id]`: `panel.hospitals` guard, approve grants the Hospital staff role tied to the org (via `getGrantService().grant(...)`, same call the Access tab's grant form makes) to `appliedBy`'s email if there is a `Profile` row for them, else just marks approved without a grant (there is no email to grant to) — `writeAuditLog`.
- [ ] Database checks: approve twice is idempotent (second call still 200, does not double-grant — reuse `grantService`'s existing "already has this role" handling); reject sets status without touching `isVerified`/granting anything; wrong permission 403, signed out 401.
- [ ] Commit.

### Task 4: Wire the screens
- [ ] `src/store/api.ts`: `getOrganizations`, `applyOrganization`, `reviewOrganization` (invalidates an `Organization` tag).
- [ ] `HospitalOrgScreen.tsx`: the hospital list comes from `useGetOrganizationsQuery` merged with real stock (same `mergeSavedStock` pattern, now against real org ids instead of the hardcoded sample array) instead of `SAMPLE_HOSPITAL_ORGS` directly; add a small "Apply to register your organization" collapsed form at the bottom (name, type, address, licence number — mirrors `CreateSosScreen.tsx`'s "More details" collapsed-section pattern) that posts to `applyOrganization` and shows a confirmation, no login required.
- [ ] `AdminPanelScreen.tsx`'s Hospitals tab and `OpsCommandScreen.tsx`'s hospital tab: same real organization list; the verification toggle calls `reviewOrganization` for real instead of local state.
- [ ] No database: both screens keep falling back to `SAMPLE_HOSPITAL_ORGS` exactly as before.
- [ ] Locale strings, gates, browser check against `.dev-db` (apply as a new organization, approve it from the Admin Panel, confirm `isVerified` persists after reload and a `role_grants` row now exists tied to that org — this last part needs a `Profile` row, i.e. a real sign-in, which this sandbox cannot produce; verify the rest and say so plainly), commit.

### Task 5: Documentation
- [ ] `docs/HANDOFF.md` progress log (update "Known issues" — hospital identity/verification is no longer sample), `docs/SPEC-MATCH-PLAN.md` module table (row 8) and WP7 status.
- [ ] Tick every box above. Final commit.
