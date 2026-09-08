'use server';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function queryDb(sql: string, params: any[] = []) {
  try {
    return await prisma.$queryRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql);
    throw error;
  }
}

export async function runDb(sql: string, params: any[] = []) {
  try {
    return await prisma.$executeRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Execute error:', error, 'SQL:', sql);
    throw error;
  }
}

export function getDb_() {
  return prisma;
}
