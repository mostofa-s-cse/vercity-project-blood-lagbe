# Dynamic dashboards: Admin Panel, Ops Command, Hospitals real data

> Work task by task. Tick a box only when done and verified, and add a line to the progress log
> in `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Why:** Admin Panel (every tab but Access), Ops Command and parts of the Hospitals screen still
read `src/data/mockData.ts` sample data through old shapes (`EmergencyDemand`, `BloodRequest`, the
old `Donor`/`HospitalOrganization` mock types) instead of the real API and DTOs M1 already built
(`DonorDto`, `RequestDto`, `GET/PATCH /api/requests`, `GET /api/donors`, the hospital stock API).
This plan reuses what M1 built wherever the data already exists in the database, and adds the
smallest new schema needed for the rest (fraud reports, an audit log).

**Owner has a local throwaway Postgres** for this work: `.dev-db/start.sh` / `stop.sh` (native
`postgresql@16`, port 55432), `.env.local` already points at it, seeded (`npm run db:seed`). They
will swap in a real Supabase project later; nothing in the code should need to change for that.

## Explicitly out of scope (say so in the UI, don't fake it)
- **Ops Command cold-chain temperatures and telecom gateway health**: no real sensor or SMS
  gateway integration exists or is planned. Leave these two as clearly-labeled sample panels
  (same honesty the FAQ already uses elsewhere), not a feature to wire up.
- **Hospital/organization verification, licensing** (WP7): needs a real `Organization` model
  (accounts, licence, verified flag) that doesn't exist yet. Out of this plan; the hospital
  *stock* numbers do get wired to the real `HospitalStock` table (already exists, already seeded).
- **Donor Passport** (donation history, eligibility): needs WP3 (a donor profile linked to the
  signed-in account) and a `Donation` model, neither of which exist yet. Separate future plan.

## Contracts (do not change without updating this file)

### New models (migration `0006_fraud_and_audit`)
```prisma
model FraudIncident {
  id            String   @id @default(cuid())
  type          String
  location      String
  description   String
  targetEntity  String?  @map("target_entity")
  carrierInfo   String?  @map("carrier_info")
  evidence      String?
  severity      String   // 'HIGH' | 'MED-HIGH' | 'CRITICAL' (matches src/types/blood.ts FraudIncident)
  status        String   @default("pending") // 'pending' | 'banned' | 'throttled' | 'dismissed'
  reportedBy    String?  @map("reported_by") // Supabase user id, if reported by a signed-in person
  createdAt     DateTime @default(now()) @map("created_at")
  resolvedAt    DateTime? @map("resolved_at")
  resolvedBy    String?  @map("resolved_by")
  @@index([status, createdAt])
  @@map("fraud_incidents")
}

model AuditLog {
  id         String   @id @default(cuid())
  actorEmail String?  @map("actor_email")
  action     String   // short machine key, e.g. "stock.update", "fraud.resolve", "role.grant"
  detail     String
  createdAt  DateTime @default(now()) @map("created_at")
  @@index([createdAt])
  @@map("audit_log")
}
```

### Endpoints
| Method and path | Notes |
|---|---|
| `GET /api/admin/stats` | `panel.open`. `{ totalDonors, availableDonors, requestsByStatus: {PENDING,DONOR_FOUND,COMPLETED,CANCELLED}, responses }`, one round trip for the Overview tab. |
| `GET /api/admin/fraud` | `panel.fraud` or `ops.command`. List, newest first. |
| `PATCH /api/admin/fraud/[id]` | `{ status: 'banned'\|'dismissed' }`. `panel.fraud` or `ops.command`. Writes an `AuditLog` row. |
| `GET /api/admin/logs` | `panel.logs`. Latest 100 `AuditLog` rows. |

Donors, Requests and Hospital Stock tabs reuse the existing `GET /api/donors`, `GET /api/requests`,
`PATCH /api/requests/[id]`, `GET /api/hospitals/stock`, `POST /api/hospitals/[id]/stock` — no new
endpoints.

## Tasks

### Task 1: Schema and seed
- [x] `prisma/schema.prisma`: add `FraudIncident`, `AuditLog`. `prisma/migrations/0006_fraud_and_audit/migration.sql` (hand-written, following the house style).
- [x] Verify on the local throwaway Postgres: apply, check both tables, `prisma migrate diff` prints empty (no drift).
- [x] `prisma/seed.ts`: seed `FraudIncident` from `src/data/mockData.ts`'s `FRAUD_INCIDENTS` (fixed ids, upsert, idempotent like the rest of the seed).
- [x] Commit.

### Task 2: Admin stats, fraud and logs APIs
- [x] `src/lib/dto.ts`: `toFraudIncidentDto`, `toAuditLogDto`.
- [x] `GET /api/admin/stats`, `GET /api/admin/fraud`, `PATCH /api/admin/fraud/[id]`, `GET /api/admin/logs`. Each checks its permission server-side (`requirePermission`/`requireAnyPermission` in `src/lib/adminGuard.ts`), 401 signed out, 503 with no database.
- [x] A tiny `writeAuditLog(actorEmail, action, detail)` helper in `src/lib/auditLog.ts`, called from: fraud resolve, hospital stock change (`PUT /api/hospitals/[id]/stock`), role grant/revoke (the two `/api/admin/grants` routes — simpler than threading it through `grantService.ts`'s injected dependencies).
- [x] Database checks on the throwaway Postgres: signed-out 401 confirmed on all four by curl; the underlying Prisma queries and the race-safe "resolve once" update (`updateMany` with `status: 'pending'` in the `where`) verified directly against seeded data. The "right permission → 200" path needs a real Supabase session to test, same limitation the existing `roles`/`grants` admin routes already have (see `docs/HANDOFF.md` known issues) — not re-litigated here.
- [x] Commit.

### Task 3: RTK Query endpoints
- [x] `src/store/api.ts`: `getAdminStats`, `getFraudIncidents`, `resolveFraudIncident` (invalidates a new `Fraud` tag), `getAuditLog`.
- [x] Tests with a stubbed `fetch`.
- [x] Commit.

### Task 4: Admin Panel — Overview, Donors, Requests tabs (parallel agent)
- [ ] Overview tab: real counts from `useGetAdminStatsQuery` replace the four hardcoded metric cards; the blood-group matrix (`stock`/`demand` per group) can stay sample **only** where marked (no demand/forecast data exists anywhere) — say so in a small note, don't invent a number for "demand".
- [ ] Donors tab: `useGetDonorsQuery`, render `DonorDto` fields only (same rule as M1 Task 7). Drop fields the DTO doesn't have.
- [ ] Requests tab: `useGetRequestsQuery` + `useUpdateRequestStatusMutation` (admin already has `panel.requests`, which M1's PATCH authorization already accepts — no new server logic needed).
- [ ] No database: every tab still shows sample data with the same demo notice style as the user-facing screens.
- [ ] Gates, browser check (Playwright, `NEXT_PUBLIC_ADMIN_OPEN=true` from `.env.local`), commit.

### Task 5: Admin Panel — Hospitals, Fraud, Logs tabs (parallel agent)
- [ ] Hospitals tab: same stock merge pattern `HospitalOrgScreen.tsx` already uses (`fetchHospitalStock` over the sample hospital list); hospital identity/verification stays sample (say so), stock numbers are real.
- [ ] Fraud tab: `useGetFraudIncidentsQuery` + `useResolveFraudIncidentMutation`.
- [ ] Logs tab: `useGetAuditLogQuery` for the log lines; leave the telecom-gateway health cards as explicitly-labeled sample (per "explicitly out of scope" above).
- [ ] Gates, browser check, commit.

### Task 6: Ops Command — SOS queue, stock matrix, fraud (parallel agent)
- [ ] "Emergency SOS Queue" tab: `useGetRequestsQuery`/`useUpdateRequestStatusMutation` replace `INITIAL_DEMANDS`; "Manual SOS Intake" posts through the existing `useCreateSosMutation`.
- [ ] "Hospitals & Cold-Chain Stocks" tab: hospital cards' bag counts from the real stock API (same as Task 5); leave the chiller-unit temperatures as sample (out of scope above), labeled.
- [ ] "Anti-Fraud & Syndicates" tab: same `FraudIncident` API as the Admin Panel's Fraud tab (shared data, two screens).
- [ ] Leave "Telecom Gateways" tab as sample (out of scope above).
- [ ] Gates, browser check, commit.

### Task 7: End-to-end verification
- [ ] Real Postgres (the local `.dev-db`), migrations and seed applied, app built and started against it.
- [ ] Browser: Admin Panel Overview/Donors/Requests/Hospitals/Fraud/Logs tabs show real seeded numbers that match what the database actually has; resolving a fraud incident persists (reload keeps it); a hospital stock change from `HospitalOrgScreen` shows up in the Admin Panel's Hospitals tab too (same underlying table).
- [ ] No-database build: every tab still renders sample data; `npm run lint`, `npm test`, `npm run build` clean with no environment.
- [ ] Commit.

### Task 8: Documentation and handoff
- [ ] `docs/HANDOFF.md`: progress log, "Known issues" updated (cold-chain/telecom/verification/Donor Passport still sample, say why).
- [ ] `docs/SPEC-MATCH-PLAN.md`: module table and WP8 status updated.
- [ ] Tick every box above. Final commit.
