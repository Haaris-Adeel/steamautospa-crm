import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
let db: Database.Database;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function queryDb(sql: string, params: any[] = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.all(...params);
}

export function runDb(sql: string, params: any[] = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.run(...params);
}

export function getDb_() {
  return getDb();
}
