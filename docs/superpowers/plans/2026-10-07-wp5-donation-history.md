# WP5: Donation history and availability

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** A completed request writes a real donation record for whichever responder is a registered
donor; a donor's real last-donation date drives an automatic 90-day eligibility flag (not invented);
the Donor Passport screen shows a real donor's real history instead of the hardcoded "Tanvir Ahmed" demo.

**What stays sample, honestly:** clinical vitals (hemoglobin, blood pressure, weight, TTI screen), the
NID/QR code — no real measurement or verification system exists for these, and WP5 does not invent one.
`isAvailable` (the manual "I can donate right now" switch from WP3) is kept as-is, alongside the new
automatic `isEligible` (90-day rule) — a donor can be eligible by time but still pause themselves, and
vice versa is not possible (an ineligible donor is never shown as available regardless of the switch).

## Contracts

### Schema (migration `0008_donation_history`)
```prisma
model Donation {
  id          String    @id @default(cuid())
  donorId     String    @map("donor_id")
  donor       Donor     @relation(fields: [donorId], references: [id], onDelete: Cascade)
  requestId   String?   @map("request_id")
  request     SosRequest? @relation(fields: [requestId], references: [id], onDelete: SetNull)
  hospital    String
  units       Int       @default(1)
  donatedAt   DateTime  @default(now()) @map("donated_at")
  confirmedBy String?   @map("confirmed_by")
  @@index([donorId, donatedAt])
  @@map("donations")
}
```
`Donor` gains `lastDonationAt DateTime? @map("last_donation_at")`. `lastDonationMonths` (the static,
registration-time estimate) stays for donors who have no `Donation` row yet; once a real `Donation`
exists, `lastDonationAt` takes over for eligibility and display.

### Behaviour
- When `PATCH /api/requests/[id]` moves a request to `COMPLETED`: for every `RequestResponse` on that
  request that has a `donorId` (a registered donor, not just a name+phone), create one `Donation` row
  (`hospital` = the request's `place`, `units` = 1, `confirmedBy` = whoever completed it) and set that
  donor's `lastDonationAt` to now (if later than what is already stored).
- `isEligible` (not stored — computed): `lastDonationAt` is null, or at least 90 days have passed.
- `GET /api/donors` `available=true` now means `isAvailable AND isEligible` (both, not either).
- `DonorDto` gains `lastDonationAt: string | null` and `isEligible: boolean`.
- `GET /api/donors/[id]/donations`: that donor's donation history, newest first. Public (same level of
  exposure as the rest of a donor's directory listing — no phone numbers in it).

## Tasks

### Task 1: Schema
- [ ] `prisma/schema.prisma`: `Donation` model, `Donor.lastDonationAt`. Migration `0008_donation_history` (hand-written).
- [ ] Verify on `.dev-db`: apply, `prisma migrate diff` empty.
- [ ] Commit.

### Task 2: Write a donation on completion, compute eligibility
- [ ] `src/lib/eligibility.ts` (+test, failing first): `isEligible(lastDonationAt: Date | null, now: Date): boolean` — pure, 90-day rule.
- [ ] `PATCH /api/requests/[id]`: inside the same transaction/flow that completes a request, create `Donation` rows for responders with a `donorId`, update `lastDonationAt`.
- [ ] `src/lib/dto.ts`: `toDonorDto` gains `lastDonationAt`, `isEligible`.
- [ ] `GET /api/donors` available filter uses both flags.
- [ ] Database checks on `.dev-db`: complete a request with two responders (one with a `donorId`, one without) → exactly one `Donation` row, the right donor's `lastDonationAt` set, the other donor untouched; `available=true` excludes a donor whose `lastDonationAt` is 10 days ago even with `isAvailable=true`.
- [ ] Commit.

### Task 3: Donation history endpoint and RTK Query
- [ ] `DonationDto` in `dtoTypes.ts`, `toDonationDto` in `dto.ts`.
- [ ] `GET /api/donors/[id]/donations`.
- [ ] `src/store/api.ts`: `getDonorDonations` query.
- [ ] Tests (stubbed fetch).
- [ ] Commit.

### Task 4: Donor Passport on real data
- [ ] `DonorPassportScreen.tsx`: for the donor this browser remembers (`myDonorProfile`, same helper WP3 added) or the signed-in person's own (`mine=1`), show their real name, blood group, `isEligible`/`lastDonationAt` (the cooldown dial becomes real), and real donation history (`getDonorDonations`) instead of the fixed 3-entry sample list. The "Simulate Resting" demo toggle is removed (it no longer makes sense once the dial is real).
- [ ] Vitals (hemoglobin, blood pressure, weight, TTI), the NID number and the QR code stay exactly as before (sample, labeled) — no real source for them exists.
- [ ] No remembered/signed-in donor, or no database: falls back to the existing sample "Tanvir Ahmed" passport unchanged, with a demo notice.
- [ ] Locale strings, gates, browser check against `.dev-db` (complete a real request for a real donor, reload the passport, see the real donation appear), commit.

### Task 5: Documentation
- [ ] `docs/HANDOFF.md` progress log, `docs/SPEC-MATCH-PLAN.md` module table (row 6) and WP5 status.
- [ ] Tick every box above. Final commit.
