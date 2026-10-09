/**
 * Loads the demo donors and blood requests from src/data/mockData.ts into the database, so a new
 * database looks like the demo. Safe to run again: everything has a fixed id and existing rows are kept.
 * Values the database has no column for (haemoglobin, ratings, ...) are dropped, never invented.
 *
 *   npm run db:seed        (needs DATABASE_URL, see .env.example)
 *
 * Login credentials:
 * - Seeded donors/requests themselves have none — rows are written directly with Prisma, bypassing the
 *   API, so they get no `manageTokenHash` (null) and can't be edited/tracked by a manage token, unlike a
 *   donor or request created through the real UI.
 * - One fixed Supabase Auth user per role is created (or reused) when `SUPABASE_SERVICE_ROLE_KEY` and
 *   the Supabase URL/anon key are set — see `DEMO_USERS` below for the full list with passwords and what
 *   each one can do. These are the only seeded accounts that can actually sign in through the UI.
 *   Skipped silently without those keys, same as every other owner's-key-gated feature in this app.
 * - `NEXT_PUBLIC_ADMIN_OPEN=true` opens the Admin Panel *pages* with no permission check at all, and
 *   `ADMIN_EMAILS` (comma-separated) grants admin to any real Supabase account by email on sign-in — two
 *   other ways in that need no seeded account. See docs/SETUP-SUPABASE.md.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { BloodGroup, RequestStatus } from '../src/generated/prisma/client';
import { INITIAL_DEMANDS, INITIAL_DONORS, SAMPLE_HOSPITAL_ORGS, FRAUD_INCIDENTS } from '../src/data/mockData';
import { getPrisma } from '../src/lib/prisma';
import { DB_BLOOD_GROUP } from '../src/lib/validation';
import { getSupabaseEnv } from '../src/lib/supabase/env';

config({ path: ['.env.local', '.env'], quiet: true });

/**
 * One fixed demo login per role this app actually distinguishes (see `src/lib/roles.ts`). Donor and
 * Blood Seeker are the same account type here — nothing in the permission system tells them apart, a
 * signed-in person can register as a donor and post a request with the same profile — so one plain
 * account stands in for both. `appMetadata` is what makes the other two more than a plain signed-in
 * person: it's written straight into the Supabase Auth user (`app_metadata`), the same place a real
 * admin grant (`grantService.ts`) would put it, read back by `permissionsOf()` in `src/lib/roles.ts`.
 */
const DEMO_USERS = [
  {
    email: 'demo@bloodlagbe.test',
    password: 'DemoPass123!',
    name: 'Demo User',
    note: 'Donor / Blood Seeker — a plain signed-in person, no admin_metadata.role at all',
    appMetadata: null as Record<string, unknown> | null,
  },
  {
    email: 'hospital-demo@bloodlagbe.test',
    password: 'DemoPass123!',
    name: 'DMCH Demo Staff',
    note: "Hospital/Organization staff — stock.own + camps.create, tied to ORG-01 (DMCH) via hospital_id",
    appMetadata: { role: 'hospital', hospital_id: 'ORG-01' },
  },
  {
    email: 'admin-demo@bloodlagbe.test',
    password: 'DemoPass123!',
    name: 'Admin Demo',
    note: 'Admin — every permission in src/lib/permissions.ts (panel.*, roles.manage, ops.command, stock.all, ...)',
    appMetadata: { role: 'admin' },
  },
] as const;

const compact = (phone: string) => phone.replace(/[\s-]/g, '');
const dbGroup = (group: string) => DB_BLOOD_GROUP[group as keyof typeof DB_BLOOD_GROUP] as BloodGroup;
const MINUTE = 60_000;

const STATUS: Record<string, RequestStatus> = {
  active: 'PENDING',
  'in-progress': 'DONOR_FOUND',
  fulfilled: 'COMPLETED',
};

/**
 * Creates (or finds) each `DEMO_USERS` Supabase Auth user, its matching `Profile` row, and (for the
 * hospital/admin ones) its `app_metadata` permissions — so there is one real, signable-in account per
 * role this app knows about. Needs the Supabase service role key; skipped (not an error) without it,
 * same as every other owner's-key-gated feature in this app.
 */
async function seedDemoUsers(prisma: ReturnType<typeof getPrisma>) {
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) {
    console.log('Skipped demo users: NEXT_PUBLIC_SUPABASE_URL/key or SUPABASE_SERVICE_ROLE_KEY not set.');
    return;
  }

  const admin = createClient(env.url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log('\nDemo logins:');

  for (const demoUser of DEMO_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: demoUser.email,
      password: demoUser.password,
      email_confirm: true,
      user_metadata: { name: demoUser.name },
      app_metadata: demoUser.appMetadata ?? undefined,
    });

    let userId = data?.user?.id;
    if (error) {
      // Already exists from a previous seed run: look its id up directly (admin.listUsers has no email
      // filter we can rely on across supabase-js versions, but we already hold the raw Postgres connection)
      // and reapply app_metadata, in case DEMO_USERS changed since it was first created.
      const existing = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM auth.users WHERE email = ${demoUser.email} LIMIT 1`;
      userId = existing[0]?.id;
      if (!userId) throw error;
      if (demoUser.appMetadata) await admin.auth.admin.updateUserById(userId, { app_metadata: demoUser.appMetadata });
    }

    await prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, email: demoUser.email, name: demoUser.name },
      update: { email: demoUser.email, name: demoUser.name },
    });

    console.log(`  ${demoUser.email} / ${demoUser.password}  —  ${demoUser.note}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set (see .env.example).');
    process.exit(1);
  }
  const prisma = getPrisma();
  const now = Date.now();

  for (const [index, donor] of INITIAL_DONORS.entries()) {
    const data = {
      name: donor.name,
      phone: compact(donor.phone),
      bloodGroup: dbGroup(donor.bloodGroup),
      area: donor.location,
      age: donor.age,
      gender: donor.gender,
      division: donor.division,
      weightKg: donor.weightKg,
      lastDonationMonths: Math.round(donor.daysElapsedSinceDonation / 30),
      vehicle: donor.vehicle,
      nearestHospital: donor.nearestHospital,
      isAvailable: donor.isAvailable,
    };
    await prisma.donor.upsert({
      where: { id: `seed-${donor.id}` },
      create: { id: `seed-${donor.id}`, ...data, createdAt: new Date(now - (index + 1) * 60 * MINUTE) },
      update: {},
    });
  }

  for (const [index, demand] of INITIAL_DEMANDS.entries()) {
    const id = `seed-${demand.id}`;
    // One answer per bag already promised in the sample data, from the seeded donors.
    const answers = INITIAL_DONORS.slice(index, index + demand.bagsPledged);
    // The same rule the API applies: a request that has been answered is "donor found".
    const base = STATUS[demand.status] ?? 'PENDING';
    const status: RequestStatus = base === 'PENDING' && answers.length > 0 ? 'DONOR_FOUND' : base;
    const critical = /critical|p1/i.test(`${demand.urgencyWindowText} ${demand.urgencyTag}`);
    const createdAt = new Date(now - (index + 1) * 45 * MINUTE);
    await prisma.sosRequest.upsert({
      where: { id },
      create: {
        id,
        patientName: demand.patientName,
        problem: demand.condition,
        area: demand.hospitalLocation,
        bloodGroup: dbGroup(demand.bloodGroup),
        bags: demand.bagsRequired,
        place: demand.hospital,
        phones: [compact(demand.attendantPhone)],
        isCritical: critical,
        language: 'en',
        postText: `Emergency blood needed\n🩸Blood group : ${demand.bloodGroup}\n💉Amount : ${demand.bagsRequired} bag(s)\n🏘Donation place : ${demand.hospital}\n☎Contact : ${compact(demand.attendantPhone)}`,
        status,
        createdAt,
        completedAt: status === 'COMPLETED' ? createdAt : null,
      },
      update: {},
    });

    if (answers.length > 0) {
      await prisma.requestResponse.createMany({
        data: answers.map((donor) => ({ requestId: id, name: donor.name, phone: compact(donor.phone), donorId: `seed-${donor.id}` })),
        skipDuplicates: true,
      });
    }
  }

  // Organizations: the 6 sample hospitals/orgs, already verified and approved (the "known good" baseline
  // new applications are compared against). Fixed ids so HospitalStock rows above keep lining up.
  for (const org of SAMPLE_HOSPITAL_ORGS) {
    await prisma.organization.upsert({
      where: { id: org.id },
      create: {
        id: org.id,
        name: org.name,
        shortCode: org.shortCode,
        type: org.type,
        division: org.division,
        district: org.district,
        address: org.address,
        hotline: compact(org.hotline),
        emergencyContact: compact(org.emergencyContact),
        directorName: org.directorName,
        licenseNumber: org.licenseNumber,
        isVerified: org.isVerified,
        status: 'approved',
        totalBeds: org.totalBeds,
        icuBeds: org.icuBeds,
      },
      update: {},
    });
  }

  // Hospital stock: seeded as "already reported" rows, in the same shape saveHospitalStock writes.
  // HospitalOrgScreen merges these over the sample hospital list by id, so this just pre-fills them.
  for (const org of SAMPLE_HOSPITAL_ORGS) {
    for (const [group, units] of Object.entries(org.bloodStock)) {
      await prisma.hospitalStock.upsert({
        where: { hospitalId_bloodGroup: { hospitalId: org.id, bloodGroup: dbGroup(group) } },
        create: { hospitalId: org.id, bloodGroup: dbGroup(group), units },
        update: {},
      });
    }
  }

  for (const [index, incident] of FRAUD_INCIDENTS.entries()) {
    const id = `seed-${incident.id}`;
    await prisma.fraudIncident.upsert({
      where: { id },
      create: {
        id,
        type: incident.type,
        location: incident.location,
        description: incident.description,
        targetEntity: incident.targetEntity,
        carrierInfo: incident.carrierInfo,
        evidence: incident.evidence,
        severity: incident.severity,
        status: incident.status,
        createdAt: new Date(now - (index + 1) * 20 * MINUTE),
      },
      update: {},
    });
  }

  await seedDemoUsers(prisma);

  const [donors, requests, responses, stockRows, fraudRows, orgs] = await Promise.all([
    prisma.donor.count(),
    prisma.sosRequest.count(),
    prisma.requestResponse.count(),
    prisma.hospitalStock.count(),
    prisma.fraudIncident.count(),
    prisma.organization.count(),
  ]);
  console.log(
    `Seeded. Database now has ${donors} donors, ${requests} requests, ${responses} responses, ${stockRows} hospital stock rows, ${fraudRows} fraud incidents, ${orgs} organizations.`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
