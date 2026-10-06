/**
 * Loads the demo donors and blood requests from src/data/mockData.ts into the database, so a new
 * database looks like the demo. Safe to run again: everything has a fixed id and existing rows are kept.
 * Values the database has no column for (haemoglobin, ratings, ...) are dropped, never invented.
 *
 *   npm run db:seed        (needs DATABASE_URL, see .env.example)
 */
import { config } from 'dotenv';
import type { BloodGroup, RequestStatus } from '../src/generated/prisma/client';
import { INITIAL_DEMANDS, INITIAL_DONORS, SAMPLE_HOSPITAL_ORGS, FRAUD_INCIDENTS } from '../src/data/mockData';
import { getPrisma } from '../src/lib/prisma';
import { DB_BLOOD_GROUP } from '../src/lib/validation';

config({ path: ['.env.local', '.env'], quiet: true });

const compact = (phone: string) => phone.replace(/[\s-]/g, '');
const dbGroup = (group: string) => DB_BLOOD_GROUP[group as keyof typeof DB_BLOOD_GROUP] as BloodGroup;
const MINUTE = 60_000;

const STATUS: Record<string, RequestStatus> = {
  active: 'PENDING',
  'in-progress': 'DONOR_FOUND',
  fulfilled: 'COMPLETED',
};

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

  const [donors, requests, responses, stockRows, fraudRows] = await Promise.all([
    prisma.donor.count(),
    prisma.sosRequest.count(),
    prisma.requestResponse.count(),
    prisma.hospitalStock.count(),
    prisma.fraudIncident.count(),
  ]);
  console.log(
    `Seeded. Database now has ${donors} donors, ${requests} requests, ${responses} responses, ${stockRows} hospital stock rows, ${fraudRows} fraud incidents.`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
