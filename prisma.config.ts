import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Next.js keeps secrets in .env.local; load it before the plain .env.
config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Migrations use the direct connection (port 5432). The app itself uses DATABASE_URL (see src/lib/prisma.ts).
    // `prisma generate` does not connect, so an unset URL is fine until you migrate.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
