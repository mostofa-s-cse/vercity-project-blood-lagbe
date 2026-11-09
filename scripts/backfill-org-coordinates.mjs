// One-off, idempotent: give the existing organizations a map coordinate (only rows that have none).
// Only the apply form sets latitude/longitude, so organizations created before WP6 (seed rows, the demo
// hospitals) never showed on the Hospitals map. Coordinates are approximate building/area locations.
//
// Usage: node scripts/backfill-org-coordinates.mjs            (dry run, prints what would change)
//        node scripts/backfill-org-coordinates.mjs --apply    (writes, using DIRECT_URL or DATABASE_URL from .env)
import { readFileSync } from 'node:fs';
import pg from 'pg';

const COORDS = {
  'ORG-01': [23.7258, 90.3976], // Dhaka Medical College Hospital, Bakshibazar
  'ORG-02': [23.7388, 90.3949], // BSMMU, Shahbagh
  'ORG-03': [23.7266, 90.3963], // Sandhani Central, DMCH hostel complex
  'ORG-04': [23.739, 90.412], // Quantum Foundation blood lab, Shantinagar
  'ORG-05': [23.732, 90.3957], // Badhan, TSC, University of Dhaka
  'ORG-06': [23.8103, 90.4313], // Evercare Hospital, Bashundhara R/A
  cmw7wg0n3000007jp9yhqhx3e: [24.372, 88.5868], // Rajshahi Medical College Hospital
  cmvtuoiwl000ptdxxprbvwu2q: [23.8069, 90.3687], // ডেমো সিটি হাসপাতাল, Mirpur (area centre)
  cmvtup26y000qtdxxth8ifelb: [23.8759, 90.3795], // ডেমো ব্লাড ব্যাংক, Uttara (area centre)
  'tut-hosp-demo': [23.7461, 90.3742], // সিটি জেনারেল হাসপাতাল (ডেমো), Dhanmondi (area centre)
};

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);
const apply = process.argv.includes('--apply');
const client = new pg.Client({ connectionString: env.DIRECT_URL || env.DATABASE_URL });
await client.connect();
try {
  for (const [id, [lat, lng]] of Object.entries(COORDS)) {
    const { rows } = await client.query('SELECT name, latitude, longitude FROM organizations WHERE id = $1', [id]);
    if (rows.length === 0) { console.log(`skip ${id}: not found`); continue; }
    const r = rows[0];
    if (r.latitude != null || r.longitude != null) { console.log(`keep ${id} ${r.name}: already ${r.latitude},${r.longitude}`); continue; }
    if (!apply) { console.log(`would set ${id} ${r.name} -> ${lat},${lng}`); continue; }
    const res = await client.query(
      'UPDATE organizations SET latitude = $2, longitude = $3 WHERE id = $1 AND latitude IS NULL AND longitude IS NULL',
      [id, lat, lng]
    );
    console.log(`set ${id} ${r.name} -> ${lat},${lng} (${res.rowCount} row)`);
  }
} finally {
  await client.end();
}
