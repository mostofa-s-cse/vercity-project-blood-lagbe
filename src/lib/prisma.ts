import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { isReadOperation, isTransientDbError } from './dbRetry.ts';

/** True when a database connection string is set (see .env.example). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * The shared Prisma client, created on first use and reused across requests.
 * Throws when DATABASE_URL is missing, so check `isDatabaseConfigured()` first.
 */
export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  if (!globalForPrisma.prisma) {
    // Keep each serverless instance's pool tiny and short-lived: Supabase's pooler allows only ~15 clients
    // in session mode (EMAXCONNSESSION), and every warm instance holds its own pool. Override with DB_POOL_MAX.
    const max = Number(process.env.DB_POOL_MAX) > 0 ? Number(process.env.DB_POOL_MAX) : 2;
    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString, max, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 }),
    });
    // A read that lands on a connection the pooler already closed is run once more (see dbRetry.ts).
    globalForPrisma.prisma = client.$extends({
      query: {
        async $allOperations({ operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
            if (isReadOperation(operation) && isTransientDbError(error)) return query(args);
            throw error;
          }
        },
      },
    }) as unknown as PrismaClient;
  }
  return globalForPrisma.prisma;
}
