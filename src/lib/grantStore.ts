import type { AppRole } from '../generated/prisma/client';
import type { GrantRecord, GrantRole, GrantStore } from './grantService';
import { getPrisma } from './prisma';

const toRole = (role: AppRole): GrantRole => (role === 'ADMIN' ? 'admin' : 'hospital');
const fromRole = (role: GrantRole): AppRole => (role === 'admin' ? 'ADMIN' : 'HOSPITAL');

function toRecord(row: {
  id: string;
  email: string;
  role: AppRole;
  hospitalId: string | null;
  grantedBy: string | null;
  createdAt: Date;
  appliedAt: Date | null;
}): GrantRecord {
  return { ...row, role: toRole(row.role) };
}

/** Grants stored in our Postgres database through Prisma. */
export function createPrismaGrantStore(): GrantStore {
  const prisma = getPrisma();
  return {
    async upsertByEmail({ email, role, hospitalId, grantedBy }) {
      const data = { role: fromRole(role), hospitalId, grantedBy };
      const row = await prisma.roleGrant.upsert({
        where: { email },
        create: { email, ...data },
        update: { ...data, appliedAt: null },
      });
      return toRecord(row);
    },
    async findByEmail(email) {
      const row = await prisma.roleGrant.findUnique({ where: { email } });
      return row ? toRecord(row) : null;
    },
    async findById(id) {
      const row = await prisma.roleGrant.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },
    async markApplied(id, at) {
      await prisma.roleGrant.update({ where: { id }, data: { appliedAt: at } });
    },
    async remove(id) {
      await prisma.roleGrant.delete({ where: { id } });
    },
    async list() {
      const rows = await prisma.roleGrant.findMany({ orderBy: { createdAt: 'desc' } });
      return rows.map(toRecord);
    },
    async findProfileIdByEmail(email) {
      const profile = await prisma.profile.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      return profile?.id ?? null;
    },
  };
}
