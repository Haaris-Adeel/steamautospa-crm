import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

function getPrismaClient() {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export function queryDb(sql: string, params: any[] = []) {
  const client = getPrismaClient();
  return client.$queryRawUnsafe(sql, ...params);
}

export function runDb(sql: string, params: any[] = []) {
  const client = getPrismaClient();
  return client.$executeRawUnsafe(sql, ...params);
}

export function getDb_() {
  return getPrismaClient();
}
