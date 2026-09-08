import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function queryDb(sql: string, params: any[] = []) {
  return prisma.$queryRawUnsafe(sql, ...params);
}

export function runDb(sql: string, params: any[] = []) {
  return prisma.$executeRawUnsafe(sql, ...params);
}

export function getDb_() {
  return prisma;
}
