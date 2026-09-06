import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/**
 * Database client. SQLite via better-sqlite3 in this deployment; the schema
 * and services are written to port to PostgreSQL. Migrations are generated
 * with drizzle-kit into ./drizzle and applied on first use.
 */
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "pixelforge.sqlite");

declare global {
  var __pfDb: ReturnType<typeof create> | undefined;
}

function create() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export const db = globalThis.__pfDb ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__pfDb = db;

export { schema };
export type Db = typeof db;
