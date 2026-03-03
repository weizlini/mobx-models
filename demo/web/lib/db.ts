import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const dbPath = path.join(projectRoot, "db", "users.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);

  return _db;
}

export function getDbPath(): string {
  return dbPath;
}
