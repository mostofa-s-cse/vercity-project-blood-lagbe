# WP6: Location and maps

> Work task by task. Tick a box only when done and verified, and add a line to the progress log in
> `docs/HANDOFF.md`. Read `CLAUDE.md` and `docs/HANDOFF.md` first.

**Goal:** Replace the fictional, hand-made `DIVISIONS` array in `DonorRegistrationScreen.tsx` (five
made-up names like "Dhaka North" / "Chattogram Port" that aren't Bangladesh's real eight divisions,
with no districts or upazilas at all) with a real administrative dataset, add real `latitude`/`longitude`
to donors, requests and organizations, compute straight-line distance server-side so "near me" and
nearest-first sorting work, and add an OpenStreetMap/Leaflet map view to the screens the spec asks for.

**Explicitly out of scope (say so, don't fake it):**
- Turn-by-turn routing or travel-time ETA — only straight-line (Haversine) distance. "Avg Donor Transit
  ETA" on the Admin Panel Overview already stays sample for this exact reason (see `docs/HANDOFF.md`).
- Address autocomplete / reverse geocoding (e.g. Nominatim) — a person picks division → district →
  upazila from the real dataset (a point with a known centroid), or shares their exact browser
  coordinates; free-text address search against a geocoding API is not built.
- PostGIS. Plain nullable `Float` columns plus a cheap SQL bounding-box pre-filter and an in-process
  Haversine sort are enough at this app's scale; a `geography` column + `ST_DWithin` index is the
  natural upgrade if the donors/organizations tables ever get large, not needed now.
- District/upazila boundary polygons on the map — point markers only (request/organization locations),
  no shape data.
- Plotting individual donor locations on the public map — a donor's phone is already masked until
  "call" is pressed (WP1); showing their home coordinates on an open map would undo that privacy
  choice. Donors keep appearing only as list rows, never as map markers.
- Matching/compatibility/notifications themselves (WP4's job) — this package only makes distance
  available to sort and filter by; wiring it into a `Notification` model is not duplicated here.

## What exists today (so the gap is concrete)
- `DonorRegistrationScreen.tsx` defines a local `DIVISIONS` constant (5 invented names) used only for
  the registration form's division dropdown — not shared, not real, no districts/upazilas anywhere.
- `BloodRequest`/`HospitalOrganization` (`src/types/blood.ts`) and `Donor`/`SosRequest`/`Organization`
  (`prisma/schema.prisma`) all have free-text `division`/`district` strings already, but no coordinates
  and no shared list of valid values.
- No map library is installed; no Geolocation API usage anywhere in the client.

## Contracts

### Geo dataset
**Verified via the GitHub API** (not assumed): `ifahimreza/bangladesh-geojson` has `"license": null` —
no `LICENSE` file, not safe to vendor. `nuhil/bangladesh-geocode` has a real MIT `LICENSE` file
(copyright Nuhil Mehdy, 2014) — this is the one used, pinned at commit `5622f68` (2023-03-17).

Its actual shape (checked by fetching the real JSON, not assumed from the README): 8 divisions
(`id`, `name`, `bn_name`, `url` — **no coordinates**), 64 districts (`id`, `division_id`, `name`,
`bn_name`, `lat`, `lon`, `url`), 494 upazilas (`id`, `district_id`, `name`, `bn_name`, `url` — **no
coordinates**). Only districts carry a real lat/lng; a division or upazila has no centroid in this
dataset. Vendored into `src/data/bdGeo.ts` as divisions → districts (with lat/lng) → upazilas
(name only, no coordinates); `src/data/BDGEO_SOURCE.md` records the source URL, commit, licence and
vendor date. Consequence for distance/"near me": the finest point we have from a picked
division/district/upazila is the **district's** centroid — an upazila selection still resolves to its
parent district's coordinates, not invented upazila-level ones. Exact browser coordinates (Task 4)
are always finer-grained than this when available.

### Schema (migration `0010_location`)
```prisma
model Donor {
  // ...existing fields...
  latitude  Float?
  longitude Float?
}
model SosRequest {
  // ...existing fields...
  latitude  Float?
  longitude Float?
}
model Organization {
  // ...existing fields...
  latitude  Float?
  longitude Float?
}
```
All nullable — a record with no coordinates (every existing row, until this ships) simply can't be
distance-sorted or placed on the map; it still works exactly as it does today everywhere else.

### Distance (pure, `src/lib/geo.ts`)
- `haversineDistanceKm(a: {lat, lng}, b: {lat, lng}): number`.
- `boundingBox(center: {lat, lng}, radiusKm: number): {minLat, maxLat, minLng, maxLng}` — a cheap
  degrees-based pre-filter so the database only hands over rows roughly in range before the exact
  Haversine distance is computed and sorted in application code.

### Endpoints (extend existing ones, no new routes)
| Method and path | Change |
|---|---|
| `GET /api/donors` | Optional `lat`, `lng`, `radiusKm`. When all three are present: bounding-box pre-filter in the Prisma `where`, then sort the page by Haversine distance; `DonorDto` gains `distanceKm: number \| null`. |
| `GET /api/requests` | Same `lat`/`lng`/`radiusKm` → nearest-first sort for Emergency Hub; `RequestDto` gains `distanceKm`. |
| `GET /api/organizations` | Same, for the hospital directory / "nearest hospital" use. |
| `POST /api/donors`, `POST /api/sos`, `POST /api/organizations/apply`, `PATCH /api/donors/[id]` | Optional `latitude`/`longitude` added to the existing parsed input (`parseDonorInput`, `parseSosInput`, `parseOrganizationApplyInput`, `parseDonorUpdateInput`). |

### Client
- `useGeolocation()` (new small hook): wraps `navigator.geolocation.getCurrentPosition`; resolves to
  coordinates or `null` on denial/timeout/unsupported — never throws, never blocks the page. Consistent
  with "emergencies must never need an account": "near me" is an enhancement, the plain list is always
  there if location isn't available.
- Leaflet map, dynamic-imported with `ssr: false` (it touches `window` at import time) and an
  OpenStreetMap tile layer (no API key — keeps the "must run with zero environment variables" rule).
  Added to Emergency Hub (requests as markers) and the Hospitals screen (organizations as markers), as
  a toggle next to the existing list view, not a replacement for it.

## Tasks

### Task 1: Geo dataset
- [x] Verified licence via the GitHub API: `ifahimreza/bangladesh-geojson` has no licence file
      (`license: null`, not usable); `nuhil/bangladesh-geocode` has a real MIT `LICENSE` — used, pinned
      at commit `5622f68`. Vendor divisions (en/bn name), districts (en/bn name, lat/lng) and upazilas
      (en/bn name, no coordinates — the dataset doesn't have them) into `src/data/bdGeo.ts`;
      `src/data/BDGEO_SOURCE.md` records the source, commit, licence and vendor date.
- [x] Replaced `DonorRegistrationScreen.tsx`'s invented `DIVISIONS` with the real dataset: a division
      select cascades to a real district select (`districtsByDivision`), defaulting to Dhaka/Dhaka;
      the stored `division` field becomes `"<District>, <Division>"` (e.g. `"Dhaka, Dhaka"`,
      `"Sylhet, Sylhet"`) — real administrative names, same single free-text column as before (upazila
      waits for a form that needs it, per plan; SOS/organization apply keep free-text `division`/
      `district` for now).
- [x] Locale: removed `divisionNames` (no longer needed — `bdGeo.ts` already carries bilingual
      `name`/`bnName` for every division and district, so the select reads the dataset directly by
      `language` instead of duplicating 72 names into two locale files); added a `district` label key
      (`en`/`bn`). `locales.test.ts` stays green.
- [x] Added `src/data/bdGeo.test.ts` (7 tests): real counts (8/64/494), referential integrity
      (division/district ids all resolve), every district's coordinate inside Bangladesh's bounding
      box, and the lookup helpers. Gates clean (`lint`, 187 tests, `build`); browser-checked in both
      languages — division→district cascades correctly (e.g. picking Sylhet narrows to its real 4
      districts), Bengali names render from the dataset with no locale duplication.
- [x] Commit.

### Task 2: Schema
- [x] `prisma/schema.prisma`: `latitude`/`longitude` on `Donor`, `SosRequest`, `Organization`. Migration
      `0010_location` (hand-written). Verified on `.dev-db`: applied clean, `prisma migrate diff
      --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script` reports
      "This is an empty migration" (no drift). `prisma generate` re-run, `lint`/`test` (187) clean.
- [x] Commit.

### Task 3: Distance, pure logic
- [x] `src/lib/geo.ts`: `haversineDistanceKm`, `boundingBox` (6 tests, test-first — Dhaka↔Chattogram
      (~211km) and Dhaka↔Sylhet (~198km) as checkable-by-hand fixtures, using `bdGeo.ts`'s real
      district centroids, not invented coordinates).
- [x] `src/lib/validation.ts`: optional `latitude`/`longitude` (both-or-neither, range-checked) added
      to `parseDonorInput`, `parseSosInput`, `parseOrganizationApplyInput`, `parseDonorUpdateInput`
      (shared `optionalLatLng` helper); new `NearQuery`/`readNear` (`lat`/`lng` required together,
      `radiusKm` optional, defaults to 50km, max 2000km) added to `parseDonorQuery`/`parseRequestQuery`
      and a new `parseOrganizationQuery` (the `GET /api/organizations` endpoint had no query parser at
      all before this). 9 new tests, test-first.
- [x] Added `src/lib/geo.test.ts` and `src/lib/validation.ts`'s new tests to the `test` script.
- [x] Gates clean (`lint`, 197 tests, `build`). Commit.

### Task 4: Endpoints and client
- [x] `GET /api/donors`, `GET /api/requests`, `GET /api/organizations`: `near` support per Contracts —
      a bounding-box pre-filter in the Prisma `where`, then the exact Haversine distance computed,
      filtered to the real radius and sorted in application code (pagination also moves into
      application code for a `near` query, since the sort can't happen in SQL); `distanceKm` in the
      three DTOs when computed, `null` otherwise. `toDonorDto`/`toRequestDto`/`toOrganizationDto` take
      an optional `distanceKm` second argument. `RequestDto`/`OrganizationDto` also gained real
      `latitude`/`longitude` (for map markers); `DonorDto` deliberately did **not** — only `distanceKm`,
      never the donor's raw coordinate, same privacy rule as the masked phone (no donor markers, see
      out-of-scope). `POST /api/donors`, `POST /api/sos`, `POST /api/organizations/apply` and
      `PATCH /api/donors/[id]` accept the optional `latitude`/`longitude`. Verified on `.dev-db` with
      curl: tagged two sample organizations/a donor/a request with real coordinates, confirmed
      `near=lat,lng,radiusKm` sorts the nearest first with an accurate `distanceKm`, confirmed a point
      outside the radius returns an empty list, confirmed bad `lat` still 400s, confirmed no `near` →
      unchanged order; confirmed `POST /api/donors` saves a real coordinate and rejects one-sided
      lat/lng. Test rows removed afterwards.
- [x] `src/store/api.ts`: `NearParams` (`lat`/`lng`/`radiusKm`) mixed into `DonorQuery`/`RequestsQuery`/
      a new `OrganizationQuery`; `getOrganizations` now takes an optional query instead of `void`. 2 new
      tests (query-string construction for donors and organizations).
- [x] `src/hooks/useGeolocation.ts` (new directory — this is a browser-only hook, doesn't belong in
      `src/lib`'s pure-and-tested rules). "Near me" wired into Emergency Hub and Donor Directory (an
      explicit opt-in button, never auto-prompted; denied/unsupported falls back to the plain list with
      an inline notice); Hospitals screen gets a "Nearest facility" button that auto-selects the closest
      facility with a real coordinate (sorted in-process with `haversineDistanceKm`, no extra query).
- [x] `leaflet` + `react-leaflet` (both compatible with React 19) added. `MapView.tsx` dynamic-imports
      `MapViewInner.tsx` with `ssr: false` (Leaflet touches `window` at import time); OSM tiles, no API
      key. Emergency Hub gained a "Map view" toggle (request markers) and the Hospitals screen gained a
      "Map" tab (organization markers) — both show an empty-state message instead of an empty map when
      nothing has a coordinate yet, never a forced-open or broken map.
- [x] No database, no geolocation permission, or geolocation denied: every screen falls back to exactly
      what it does today (plain list, no map forced open) — confirmed in the browser check below
      (geolocation denial in the Playwright-driven browser resolved back to the idle button state with
      an inline notice, no stuck loading state, no crash).
- [x] Locale strings (`en`/`bn`: `hub.ts`, `donors.ts`, `hospitals.ts`). Gates clean (`lint`, 199 tests,
      `build`). Browser-checked with Playwright against `.dev-db` with a few rows given real
      coordinates: Emergency Hub's map toggle renders a real marker with the right popup text; Hospitals
      screen's Map tab renders two real markers; "Near me"/"Nearest facility" buttons all show a loading
      state then gracefully fall back (this sandbox's headless browser has no real location to grant).
      Commit.

### Task 5: Documentation
- [x] `docs/HANDOFF.md` progress log; `docs/SPEC-MATCH-PLAN.md` module table row 2 ("Smart Donor
      Search" — real location now done, blood-group compatibility and eligibility-ranking still WP4)
      and the WP6 section/milestone table.
- [x] Tick every box above. Final commit.
