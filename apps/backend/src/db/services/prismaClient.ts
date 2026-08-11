import { loadEnv } from '@utils/envResolver';

// Automatically finds and loads the root .env file
loadEnv();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

export const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_CONNECTION_LIMIT || 20),
  connectionTimeoutMillis: Number(process.env.DB_POOL_TIMEOUT_SECONDS || 10) * 1000,
  idleTimeoutMillis: 30_000,
});
const adapter = new PrismaPg(postgresPool);

export const prisma = new PrismaClient({ adapter });

const readPool = process.env.DATABASE_READ_URL
  ? new Pool({
      connectionString: process.env.DATABASE_READ_URL,
      max: Number(process.env.DB_READ_CONNECTION_LIMIT || 10),
      connectionTimeoutMillis: Number(process.env.DB_POOL_TIMEOUT_SECONDS || 10) * 1000,
    })
  : null;
export const readPrisma = readPool ? new PrismaClient({ adapter: new PrismaPg(readPool) }) : prisma;

export async function disconnectDatabase() {
  if (readPrisma !== prisma) await readPrisma.$disconnect();
  await prisma.$disconnect();
  if (readPool) await readPool.end();
  await postgresPool.end();
}
