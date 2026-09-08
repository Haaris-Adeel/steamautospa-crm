import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

function getPrisma() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

export function queryDb(sql: string, params: any[] = []) {
  const client = getPrisma();
  return client.$queryRawUnsafe(sql, ...params);
}

export function runDb(sql: string, params: any[] = []) {
  const client = getPrisma();
  return client.$executeRawUnsafe(sql, ...params);
}

export function getDb_() {
  return getPrisma();
}
