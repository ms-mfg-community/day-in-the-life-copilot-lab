import { z } from 'zod';
import { createFileDb, createInMemoryDb, type DbHandle } from './db.js';
import { seed } from './seed.js';

const databasePathSchema = z.string().trim().min(1).optional();
const INITIALIZED_KEY = 'initial-seed-complete';
const CREATE_STATE_SQL = 'CREATE TABLE IF NOT EXISTS lab_initialization (key TEXT PRIMARY KEY)';
const HAS_DATA_SQL = `SELECT 1 FROM students
  UNION ALL SELECT 1 FROM courses
  UNION ALL SELECT 1 FROM instructors
  UNION ALL SELECT 1 FROM enrollments LIMIT 1`;

async function seedPersistentDatabase(handle: DbHandle): Promise<void> {
  handle.raw.exec(CREATE_STATE_SQL);
  handle.raw.exec('BEGIN IMMEDIATE');
  try {
    const initialized = handle.raw.prepare('SELECT key FROM lab_initialization WHERE key = ?').get(INITIALIZED_KEY);
    if (!initialized) {
      if (!handle.raw.prepare(HAS_DATA_SQL).get()) await seed(handle);
      handle.raw.prepare('INSERT INTO lab_initialization (key) VALUES (?)').run(INITIALIZED_KEY);
    }
    handle.raw.exec('COMMIT');
  } catch (error) {
    if (handle.raw.inTransaction) handle.raw.exec('ROLLBACK');
    throw error;
  }
}

export async function openApplicationDb(configuredPath?: string): Promise<DbHandle> {
  const path = databasePathSchema.parse(configuredPath);
  const handle = path === undefined ? await createInMemoryDb() : await createFileDb(path);
  try {
    if (path === undefined) await seed(handle);
    else await seedPersistentDatabase(handle);
    return handle;
  } catch (error) {
    handle.raw.close();
    throw new Error('Local application database initialization failed; no fallback database was created', { cause: error });
  }
}
