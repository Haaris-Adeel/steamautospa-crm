'use server';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function queryDb(sql: string, params: any[] = []) {
  try {
    return await prisma.$queryRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function runDb(sql: string, params: any[] = []) {
  try {
    return await prisma.$executeRawUnsafe(sql, ...params);
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
}

export function getDb_() {
  return prisma;
}
