import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { CREATE_TABLES_SQL } from './schema.js';

export type Db = BetterSQLite3Database<typeof schema>;

export interface DbHandle {
  readonly db: Db;
  readonly raw: Database.Database;
}

export async function createInMemoryDb(): Promise<DbHandle> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(CREATE_TABLES_SQL);
  const db = drizzle(sqlite, { schema });
  return { db, raw: sqlite };
}

export async function createFileDb(path: string): Promise<DbHandle> {
  const sqlite = new Database(path);
  sqlite.exec(CREATE_TABLES_SQL);
  const db = drizzle(sqlite, { schema });
  return { db, raw: sqlite };
}
