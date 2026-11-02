import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

// Keep the pool on the global in dev so HMR re-evaluations reuse it instead of
// leaking connections. max > 1 is what makes Promise.all actually parallel:
// with max: 1 every query queues behind the previous one.
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
  });

const adapter = new PrismaPg(pool);

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
