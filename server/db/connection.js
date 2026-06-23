import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'crescendo.db');

let db = null;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createSchema(db);
  }
  return db;
}

export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}
