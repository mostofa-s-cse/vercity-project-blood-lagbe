import { GrantError, type GrantRecord, type GrantStore, type RoleRecord, type RoleWithCount } from './grantService';
import { normalizePermissions } from './permissions';
import { getPrisma } from './prisma';

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  systemKey: string | null;
  createdAt: Date;
}

function toRole(row: RoleRow): RoleRecord {
  const systemKey = row.systemKey === 'admin' || row.systemKey === 'hospital' ? row.systemKey : null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    // Anything no longer in the catalogue is dropped when reading.
    permissions: normalizePermissions(row.permissions),
    isSystem: systemKey !== null,
    systemKey,
    createdAt: row.createdAt,
  };
}

const toGrant = (row: GrantRecord): GrantRecord => row;

/** Two people creating the same role name at once: the database's unique index wins. */
function nameTakenOr(error: unknown): never {
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
    throw new GrantError('name_taken');
  }
  throw error;
}

/** Roles and grants stored in our Postgres database through Prisma. */
export function createPrismaGrantStore(): GrantStore {
  const prisma = getPrisma();
  return {
    async listRoles(): Promise<RoleWithCount[]> {
      const rows = await prisma.role.findMany({
        orderBy: [{ systemKey: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
        include: { _count: { select: { grants: true } } },
      });
      return rows.map((row) => ({ ...toRole(row), grantCount: row._count.grants }));
    },
    async findRole(id) {
      const row = await prisma.role.findUnique({ where: { id } });
      return row ? toRole(row) : null;
    },
    async findRoleByName(name) {
      const row = await prisma.role.findUnique({ where: { nameKey: name.trim().toLowerCase() } });
      return row ? toRole(row) : null;
    },
    async findRoleBySystemKey(key) {
      const row = await prisma.role.findUnique({ where: { systemKey: key } });
      return row ? toRole(row) : null;
    },
    async createRole({ name, description, permissions }) {
      try {
        const row = await prisma.role.create({ data: { name, nameKey: name.toLowerCase(), description, permissions } });
        return toRole(row);
      } catch (error) {
        return nameTakenOr(error);
      }
    },
    async updateRole(id, { name, description, permissions }) {
      try {
        const row = await prisma.role.update({ where: { id }, data: { name, nameKey: name.toLowerCase(), description, permissions } });
        return toRole(row);
      } catch (error) {
        return nameTakenOr(error);
      }
    },
    async deleteRole(id) {
      await prisma.role.delete({ where: { id } });
    },

    async upsertByEmail({ email, roleId, hospitalId, grantedBy }) {
      const data = { roleId, hospitalId, grantedBy };
      return toGrant(
        await prisma.roleGrant.upsert({ where: { email }, create: { email, ...data }, update: { ...data, appliedAt: null } })
      );
    },
    async findByEmail(email) {
      return prisma.roleGrant.findUnique({ where: { email } });
    },
    async findById(id) {
      return prisma.roleGrant.findUnique({ where: { id } });
    },
    async listByRole(roleId) {
      return prisma.roleGrant.findMany({ where: { roleId } });
    },
    async markApplied(id, at) {
      await prisma.roleGrant.update({ where: { id }, data: { appliedAt: at } });
    },
    async remove(id) {
      await prisma.roleGrant.delete({ where: { id } });
    },
    async list() {
      return prisma.roleGrant.findMany({ orderBy: { createdAt: 'desc' } });
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
