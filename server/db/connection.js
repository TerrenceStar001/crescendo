import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'crescendo.db');

let _db = null;

export async function getDB() {
  if (!_db) {
    const url = process.env.TURSO_DB_URL || `file:${DB_PATH}`;
    const authToken = process.env.TURSO_DB_TOKEN;

    _db = createClient({ url, authToken });

    if (!process.env.TURSO_DB_URL) {
      await _db.execute('PRAGMA journal_mode = WAL');
      await _db.execute('PRAGMA foreign_keys = ON');
    }

    await createSchema(_db);
  }
  return _db;
}

export async function closeDB() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
