import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return globalForPrisma.prisma;
}

export async function queryDb(sql: string, params: any[] = []) {
  try {
    const prisma = getPrisma();
    return await prisma.$queryRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Query error:', error, 'SQL:', sql);
    throw error;
  }
}

export async function runDb(sql: string, params: any[] = []) {
  try {
    const prisma = getPrisma();
    return await prisma.$executeRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Execute error:', error, 'SQL:', sql);
    throw error;
  }
}

export function getDb_() {
  return getPrisma();
}
