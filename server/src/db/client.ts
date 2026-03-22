import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const dataDirectory = path.resolve(process.cwd(), 'data');
const databaseFile = path.join(dataDirectory, 'jakhira.db');

fs.mkdirSync(dataDirectory, { recursive: true });

const sqlite = new Database(databaseFile);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);
export { sqlite };
