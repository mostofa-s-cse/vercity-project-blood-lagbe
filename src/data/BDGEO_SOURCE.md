# Source of `bdGeo.ts`

- Repo: https://github.com/nuhil/bangladesh-geocode
- Commit pinned: `5622f68bd07a` (2023-03-17)
- Licence: MIT (copyright Nuhil Mehdy, 2014) — confirmed via `gh api repos/nuhil/bangladesh-geocode/license`,
  real `LICENSE` file present in the repo.
- Files used: `divisions/divisions.json`, `districts/districts.json`, `upazilas/upazilas.json`.
- Vendored: 2026-10-08.

A second candidate, `ifahimreza/bangladesh-geojson`, was checked first and rejected: `gh api
repos/ifahimreza/bangladesh-geojson` reports `"license": null` (no `LICENSE` file in the repo), so it
isn't safe to vendor.

## What the source data actually has

- Divisions (8): `id`, `name`, `bn_name` — **no coordinates**.
- Districts (64): `id`, `division_id`, `name`, `bn_name`, `lat`, `lon` — real centroid coordinates.
- Upazilas (494): `id`, `district_id`, `name`, `bn_name` — **no coordinates**.

Only districts have a real lat/lng in this dataset. `src/data/bdGeo.ts` does not invent coordinates
for divisions or upazilas: picking an upazila resolves to its parent district's centroid (see
`districtCoords()`), which is as precise as this free dataset gets without a real geocoding service.
