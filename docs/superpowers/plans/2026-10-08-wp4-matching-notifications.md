# WP4: Matching and notifications

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** Posting an emergency request notifies the donors who can actually help: blood-group
**compatible** (not just equal), available, eligible (90-day cooldown, WP5), not the requester, and
preferably **nearby** (WP6 distance where both sides have a coordinate, else the existing free-text
area/division match). A real `Notification` table replaces the bell's current fake data; the bell reads
it, marks it read, shows a real unread count.

**What exists today is fake, not just missing (say so plainly):** `src/context/AppStateContext.tsx`'s
`notifications` state is `usePersistentState` (this browser's `localStorage` only, never a server or
another recipient), seeded from `INITIAL_NOTIFICATIONS` sample rows in `src/data/mockData.ts`, and the
only thing that ever adds to it is `handleSosCreated` — which notifies **the poster's own browser**
about **their own** SOS, with a hardcoded Bengali string and a literal `timestamp: 'এইমাত্র'` instead of
a real date. That is not matching or notifying donors at all; it is a decorative self-toast duplicating
what `showToast` already does. `NotificationsModal.tsx`'s footer also claims `t.notifications.smsGatewayLive`
("SMS Gateway: Live") unconditionally — untrue, no SMS gateway is connected to anything.

**Explicitly out of scope (say so, don't fake it):**
- Email and SMS **sending**. Both get a real, honest interface and an environment-variable switch;
  without a configured provider, the call is skipped (logged, never blocks the request, never pretends
  to send). A real Resend/SMTP/SMS-gateway account is the owner's job, same as the Supabase keys.
- Web push (VAPID). Not requested for this pass; in-app + the email/SMS switch cover the spec's
  "Done when" bar.
- A job queue / background worker. This project has no such infrastructure anywhere (fraud resolution,
  audit logging, hospital-stock changes — every side effect so far runs synchronously inside the
  request handler that triggered it). Creating `Notification` rows (and attempting email/SMS) happens
  synchronously inside `POST /api/sos`, same style. If the donor list is ever large enough for this to
  matter, that is a scaling problem for later, not now.
- Re-notifying on every later change to a request (status updates, etc.) — only creation notifies.
- Any blood group's compatibility table beyond the standard ABO/Rh one donors already learn at any
  blood bank; no plasma-only/platelet-only distinctions (this app doesn't track donation type).

## What exists today (so the gap is concrete)
- The bell icon (`src/components/Header.tsx`), `NotificationsModal.tsx`, and `AppStateContext`'s
  `notifications`/`unreadCount`/`markNotificationRead`/`clearAllNotifications` are all wired up and
  working — against entirely fake, per-browser data.
- `src/types/blood.ts`'s `DonorNotification` has five `type` values
  (`urgent_request | match_found | handshake_completed | system_alert | eligibility_alert`); only the
  first is real after this package (an incoming compatible request). The rest were never implemented
  and are sample flavour — dropped, not built around.
- `src/lib/eligibility.ts` (`isEligible`, 90-day rule, WP5) and `src/lib/geo.ts`
  (`haversineDistanceKm`, WP6) already exist and are reused here, not duplicated.

## Contracts

### Schema (migration `0011_notifications`)
```prisma
model Notification {
  id         String     @id @default(cuid())
  donorId    String     @map("donor_id")
  donor      Donor      @relation(fields: [donorId], references: [id], onDelete: Cascade)
  requestId  String     @map("request_id")
  request    SosRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  /// Only kind this package creates; room for more later, not invented now.
  type       String     @default("compatible_request")
  bloodGroup BloodGroup @map("blood_group")
  isRead     Boolean    @default(false) @map("is_read")
  createdAt  DateTime   @default(now()) @map("created_at")

  @@index([donorId, isRead])
  @@map("notifications")
}
```
No `userId` column: a notification belongs to a `Donor` row, whether or not that donor is linked to a
signed-in `Profile` (same ownership model WP3 already built for editing a donor profile). The bell reads
by donor id, authorised the same triad as everywhere else (manage token, signed-in owner, or
`panel.donors`) via the existing `canManageDonor()` (`src/lib/donorAccess.ts`).

### Compatibility (pure, `src/lib/bloodCompatibility.ts`)
- `COMPATIBLE_DONORS: Record<BloodGroupValue, BloodGroupValue[]>` — keyed by the **recipient's** group,
  listing every donor group that may give to them (standard ABO/Rh table: `O-` is the universal donor,
  `AB+` the universal recipient).
- `isCompatibleDonor(donorGroup, recipientGroup): boolean`.

### Matching (pure, `src/lib/donorMatching.ts`)
- `findMatchingDonors(donors, request, options): Donor[]` — filters to: compatible blood group,
  `isAvailable`, `isEligible(lastDonationAt)`, not the requester (`donor.userId !== request.userId`,
  when both are signed in), and **nearby**: both sides have a coordinate → `haversineDistanceKm` within
  `options.radiusKm` (default 50, same as WP6's "near me"); otherwise fall back to an exact,
  case-insensitive match on `area` or `division` text. A request with no `area`/`division` and no
  coordinate matches no one on location — not "everyone" (a silent, surprising blast to the whole donor
  base is worse than notifying nobody for an under-specified request).
- Takes plain objects (`{ id, bloodGroup, area, division, latitude, longitude, isAvailable,
  lastDonationAt, userId }`), no Prisma types — the route maps rows into this shape.

### Endpoints
| Method and path | Notes |
|---|---|
| `GET /api/donors/[id]/notifications` | `canManageDonor()` gated (401/403), same as `GET /api/donors/[id]/donations`. Returns `{ notifications: NotificationDto[], unreadCount: number }`, newest first. |
| `PATCH /api/donors/[id]/notifications/[notificationId]` | `{ isRead: true }`. Same gate; 404 if the notification isn't this donor's. |
| `POST /api/sos` (extended) | After creating the request, run `findMatchingDonors` against real donor rows (bounding-box pre-filtered the same way `GET /api/donors`'s `near` does, WP6) and `prisma.notification.createMany` one row per match; then, per match, call the email/SMS dispatch stub (below). Failures here never fail the SOS response — the request is already saved. |

### Delivery channels (`src/lib/notifyChannels.ts`)
- `sendEmail(to, subject, body): Promise<void>` and `sendSms(to, body): Promise<void>`. Each checks its
  own environment variable (`RESEND_API_KEY` / an SMS gateway key, names TBD when the owner provides
  one) and **returns immediately, doing nothing but a debug log**, when unset — never throws, never
  blocks, never pretends to have sent something. No real provider is wired in this package; this is the
  honest switch the spec asks for, ready for the owner to plug a real key into later.
- `NotificationsModal.tsx`'s `smsGatewayLive` footer claim is removed (or made genuinely conditional on
  the SMS environment variable being set) — it was always false.

## Tasks

### Task 1: Schema
- [x] `prisma/schema.prisma`: `Notification` model, `Donor.notifications`/`SosRequest.notifications`
      relations. Migration `0011_notifications` (hand-written). Verified on `.dev-db`: applied clean,
      `prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma
      --script` reports "This is an empty migration" (no drift). `prisma generate` re-run, gates clean.
- [x] Commit.

### Task 2: Pure logic — compatibility and matching
- [ ] `src/lib/bloodCompatibility.ts`: `COMPATIBLE_DONORS`, `isCompatibleDonor` (failing tests first —
      assert the full 8×8 table explicitly, including `O-` → all 8 and `AB+` receiving from all 8, not
      just a couple of spot checks).
- [ ] `src/lib/donorMatching.ts`: `findMatchingDonors` (failing tests first — compatible-but-excluded
      cases: wrong group, unavailable, ineligible (within 90 days), the requester themself, too far with
      real coordinates, no location data at all on either side).
- [ ] `src/lib/notifyChannels.ts`: `sendEmail`/`sendSms` stubs (tests: resolve without throwing whether
      or not the environment variable is set; never actually call `fetch`/a real SDK in this package).
- [ ] Add the new test files to the `test` script in `package.json`.
- [ ] Commit.

### Task 3: Endpoints
- [ ] `src/lib/dtoTypes.ts`/`dto.ts`: `NotificationDto`, `toNotificationDto`.
- [ ] `GET /api/donors/[id]/notifications`, `PATCH /api/donors/[id]/notifications/[notificationId]`.
- [ ] `POST /api/sos`: after creating the request, run the real matching against donor rows (bounding
      box pre-filter when the request has a coordinate, same pattern as WP6's `near`) and
      `createMany` the `Notification` rows; call `sendEmail`/`sendSms` per match (best-effort, logged on
      failure, never blocking the response).
- [ ] Database checks on `.dev-db` (curl/script): seed a couple of compatible and incompatible donors
      (varied group/availability/eligibility/location), post an SOS, confirm exactly the matching donors
      got a `Notification` row; confirm the donor-notifications endpoint's permission triad (401/403/200)
      matches `GET /api/donors/[id]/donations`'s already-proven behaviour.
- [ ] Commit.

### Task 4: Client and the bell
- [ ] `src/store/api.ts`: `getDonorNotifications`, `markNotificationRead`, tagged for invalidation.
- [ ] Replace `AppStateContext`'s fake `notifications`/`unreadCount`/`markNotificationRead`/
      `clearAllNotifications` (backed by `usePersistentState`/`INITIAL_NOTIFICATIONS`) with the real
      API, scoped to the donor identified by this browser's remembered donor id (same `rememberedId`
      pattern `DonorRegistrationScreen.tsx`/`DonorPassportScreen.tsx` already use, WP3/WP5) or a
      signed-in person's own donor profile (`mine=true`, WP3). Nobody identified as a donor → the bell
      shows no count and opens to an honest empty state, not sample rows.
- [ ] Delete `handleSosCreated`'s fake self-notification and the now-unused `INITIAL_NOTIFICATIONS`
      sample data and the `match_found`/`handshake_completed`/`system_alert`/`eligibility_alert`
      `DonorNotification` types that were never implemented (keep `compatible_request` only, renamed
      from `urgent_request` if that reads better — check call sites before renaming).
- [ ] `NotificationsModal.tsx`: real `createdAt` instead of the hardcoded `'এইমাত্র'` string (format with
      the existing locale date/relative-time convention, check other screens for one before inventing a
      new one); remove or genuinely condition the `smsGatewayLive` claim.
- [ ] No database, or no donor identified: bell shows empty, exactly like every other screen's
      no-database/no-identity fallback — never sample notifications.
- [ ] Locale strings, gates (`lint`/`test`/`build`), browser check against `.dev-db`: register as a
      donor compatible with a posted SOS, confirm the bell shows a real unread notification after
      reload, mark it read, confirm it persists read across reload.
- [ ] Commit.

### Task 5: Documentation
- [ ] `docs/HANDOFF.md` progress log; `docs/SPEC-MATCH-PLAN.md` module table rows 2/4/"Notification
      system", WP4 section, milestone table (M2).
- [ ] Tick every box above. Final commit.
