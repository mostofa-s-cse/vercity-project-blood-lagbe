/**
 * Fills `sos_requests.division` for rows made before that column existed, from each request's place/area
 * (same rule as POST /api/sos). Only rows with no division are touched; ones that name none stay null.
 *
 *   npm run db:backfill-division        (needs DATABASE_URL)
 */
import { config } from 'dotenv';
import { divisionOf } from '../src/lib/divisions';
import { getPrisma } from '../src/lib/prisma';

config({ path: ['.env.local', '.env'], quiet: true });

async function main() {
  const prisma = getPrisma();
  const rows = await prisma.sosRequest.findMany({ where: { division: null }, select: { id: true, place: true, area: true } });
  let filled = 0;
  for (const row of rows) {
    const division = divisionOf(row.place) ?? divisionOf(row.area);
    if (!division) continue;
    await prisma.sosRequest.update({ where: { id: row.id }, data: { division } });
    filled += 1;
  }
  console.log(`Checked ${rows.length} requests without a division, filled ${filled}.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
