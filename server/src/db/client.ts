import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const databaseFile = path.resolve(process.cwd(), 'data', 'jakhira.db');
const sqlite = new Database(databaseFile);

export const db = drizzle(sqlite);
