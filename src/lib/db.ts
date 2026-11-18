import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { requireEnv } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Prisma 7 talks to Postgres through a driver adapter, so the pool is owned by
 * `pg`. Supabase's transaction pooler (pgbouncer) requires prepared statements
 * to be off; `pg` does not name its statements, so no extra flag is needed, but
 * the connection string must carry `pgbouncer=true&connection_limit=1`.
 *
 * In development Next.js re-evaluates modules on every edit. Caching the client
 * on `globalThis` prevents a new pool per hot reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = requireEnv("DATABASE_URL");

  // Serverless: keep the pool small. Vercel freezes idle functions anyway.
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.PRISMA_POOL_MAX ?? 3),
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
