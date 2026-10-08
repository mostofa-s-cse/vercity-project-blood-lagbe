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
- [x] `src/lib/bloodCompatibility.ts`: `COMPATIBLE_DONORS`, `isCompatibleDonor` (7 tests, test-first —
      the full 8×8 table explicitly, `O-` → all 8, `AB+` receiving from all 8, Rh mismatch rejected).
- [x] `src/lib/donorMatching.ts`: `findMatchingDonors` (13 tests, test-first — wrong group, unavailable,
      ineligible (within 90 days), the requester themself, too far with real coordinates, area/division
      text fallback (case-insensitive, trimmed), an under-specified request matching nobody).
- [x] `src/lib/notifyChannels.ts`: `sendEmail`/`sendSms` stubs (4 tests: resolve without throwing whether
      or not the environment variable is set; no real provider call is ever made in this package).
- [x] Added the new test files to the `test` script in `package.json`.
- [x] Gates clean (`lint`, 223 tests). Commit.

### Task 3: Endpoints
- [x] `src/lib/dtoTypes.ts`/`dto.ts`: `NotificationDto` (also carries the request's `place`, joined, for
      a readable notification), `toNotificationDto`.
- [x] `GET /api/donors/[id]/notifications`, `PATCH /api/donors/[id]/notifications/[notificationId]`.
- [x] `POST /api/sos`: after creating the request, pre-filters candidate donors in SQL (compatible
      blood groups via `COMPATIBLE_DONORS`, `isAvailable`, the 90-day eligibility cutoff) then runs the
      real `findMatchingDonors` in application code for the exact nearby/area logic, `createMany`s the
      `Notification` rows, and calls `sendEmail`/`sendSms` per match — all inside its own try/catch so a
      notify failure never turns an already-saved SOS into a failed response.
- [x] Database checks on `.dev-db` (curl): registered 5 real donors covering every exclusion case
      (compatible+available+eligible+same-area, wrong group, unavailable, ineligible (recent donation),
      compatible-but-wrong-area) plus one real SOS request; confirmed **exactly** the one correct donor
      got a `Notification` row, no others. Confirmed the notifications endpoint's permission triad
      (401 no credentials / 403 wrong token / 200 correct token) matches the already-proven
      `GET /api/donors/[id]/donations` pattern exactly; confirmed `PATCH .../[notificationId]` marks read
      (unread count drops to 0) and 404s for a notification that belongs to a different donor. Test rows
      removed afterwards (cascade correctly cleaned up the notification rows with the request).
- [x] Gates clean (`lint`, 223 tests, `build`). Commit.

### Task 4: Client and the bell
- [x] `src/store/api.ts`: `getDonorNotifications`, `markNotificationRead`, new `Notification` tag.
- [x] Replaced `AppStateContext`'s fake `notifications`/`unreadCount`/`markNotificationRead`/
      `clearAllNotifications` (backed by `usePersistentState`/`INITIAL_NOTIFICATIONS`) with the real
      API, scoped to the donor identified by this browser's remembered donor id (same `rememberedId`
      pattern `DonorRegistrationScreen.tsx`/`DonorPassportScreen.tsx` already use, WP3/WP5) or a
      signed-in person's own donor profile (`mine=true`, WP3). Nobody identified as a donor → the bell
      shows no count and opens to an honest empty state, not sample rows. `clearAllNotifications` is
      repurposed as "mark all read" (there is no delete concept in this schema).
- [x] Deleted `handleSosCreated`'s fake self-notification, the now-unused `INITIAL_NOTIFICATIONS`
      sample data, and the whole `DonorNotification` type (`match_found`/`handshake_completed`/
      `system_alert`/`eligibility_alert` were never implemented and `urgent_request` is now just
      `NotificationDto`'s real `type: 'compatible_request'`). Also found and fixed `Header.tsx`'s
      `unreadCount = 2` fake default prop (dead in practice since `AppShell.tsx` always passes the real
      value, but still a misleading default).
- [x] `NotificationsModal.tsx` rewritten against `NotificationDto` directly: real `createdAt`
      (`toLocaleString()`, same convention `DonorPassportScreen.tsx` already uses for dates — no new
      relative-time utility invented) instead of the hardcoded `'এইমাত্র'` string; the always-false
      `smsGatewayLive` footer claim removed outright (no SMS gateway exists to condition it on).
- [x] No database, or no donor identified: bell shows empty, exactly like every other screen's
      no-database/no-identity fallback — never sample notifications.
- [x] Locale strings (`en`/`bn` `notifications.ts`: `markAllRead`, `message`, removed `clearAll`/
      `smsGatewayLive`). Gates clean (`lint`, 223 tests, `build` — re-verified with a clean
      `tsconfig.tsbuildinfo`, since TypeScript's incremental cache was briefly masking a real "no
      exported member" error from the `DonorNotification` deletion; worth clearing that cache before any
      final gate check from now on). Browser-checked against `.dev-db` end to end: registered a real
      compatible donor (O-) through the browser (so the manage token is actually remembered in
      `localStorage`, not just created via curl), posted a matching SOS, reloaded and saw a real unread
      badge and the real notification text/timestamp, marked it read, reloaded again and confirmed the
      badge was gone (read state persisted server-side, not just client state). Test rows removed
      afterwards, cascade confirmed clean.
- [x] Commit.

### Task 5: Documentation
- [x] `docs/HANDOFF.md` progress log; `docs/SPEC-MATCH-PLAN.md` module table rows 2/4/5/"Notification
      system", WP4 section, milestone table (M2), realistic match ~84% → ~90%.
- [x] Tick every box above. Final commit.
