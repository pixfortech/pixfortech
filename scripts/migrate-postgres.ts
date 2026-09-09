import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { createPool, directUrl } from "./lib/pool";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/server/db/schema";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const pool = createPool(directUrl());
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

async function main() {
  if (pool instanceof NeonPool) await migrateNeon(drizzleNeon(pool as unknown as NeonPool), { migrationsFolder: "drizzle/postgres" });
  else await migratePg(drizzlePg(pool), { migrationsFolder: "drizzle/postgres" });
  if (!process.argv.includes("--import-sqlite")) return;
  const source = process.env.DATABASE_PATH ?? path.resolve("data/pixelforge.sqlite");
  const sqlite = new Database(source, { readonly: true, fileMustExist: true });
  mkdirSync("data/backups", { recursive: true });
  const backup = path.resolve(`data/backups/pre-postgres-${Date.now()}.sqlite`);
  await sqlite.backup(backup);
  const check = sqlite.pragma("integrity_check") as { integrity_check: string }[];
  if (check.some((r) => r.integrity_check !== "ok") || (sqlite.pragma("foreign_key_check") as unknown[]).length) throw new Error("SQLite integrity checks failed; source preserved.");
  const tables = (Object.values(schema) as unknown[]).filter((t): t is PgTable => t instanceof PgTable)
    .map(getTableConfig).filter((t) => sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t.name));
  // Sort using the actual foreign keys, never disable FK checking.
  const pending = new Map(tables.map((t) => [t.name, t]));
  const ordered: typeof tables = [];
  while (pending.size) {
    const ready = [...pending.values()].filter((t) => t.foreignKeys.every((fk) => {
      const target = getTableConfig(fk.reference().foreignTable).name;
      return target === t.name || !pending.has(target);
    }));
    if (!ready.length) throw new Error("Cyclic foreign keys require an explicit migration plan.");
    ready.forEach((t) => { ordered.push(t); pending.delete(t.name); });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const t of ordered) {
      const result = await client.query(`SELECT count(*)::int AS n FROM ${quote(t.name)}`);
      if (result.rows[0].n !== 0) throw new Error("Import requires an empty target; no rows overwritten.");
    }
    for (const t of ordered) {
      const rows = sqlite.prepare(`SELECT * FROM ${quote(t.name)}`).all() as Record<string, unknown>[];
      const names = t.columns.map((c) => c.name);
      const expected = rows.map((row) => t.columns.map((c) => {
        const value = row[c.name];
        if (value == null) return null;
        if (c.dataType === "date") return new Date(Number(value)).toISOString();
        if (c.dataType === "boolean") return Boolean(value);
        return value;
      }));
      for (let offset = 0; offset < expected.length; offset += 100) {
        const chunk = expected.slice(offset, offset + 100);
        const placeholders = chunk.map((row, r) => `(${row.map((_, c) => `$${r * names.length + c + 1}`).join(",")})`).join(",");
        await client.query(`INSERT INTO ${quote(t.name)} (${names.map(quote).join(",")}) VALUES ${placeholders}`, chunk.flat());
      }
      const actual = await client.query(`SELECT ${names.map(quote).join(",")} FROM ${quote(t.name)}`);
      const canonical = (values: unknown[][]) => values.map((r) => JSON.stringify(r)).sort();
      const actualValues = actual.rows.map((row: Record<string, unknown>) => names.map((name) => row[name] instanceof Date ? row[name].toISOString() : row[name]));
      if (JSON.stringify(canonical(expected)) !== JSON.stringify(canonical(actualValues))) throw new Error(`Verification failed for ${t.name}; import rolled back.`);
      console.log(`${t.name}: ${rows.length} rows verified`);
    }
    await client.query("COMMIT");
    console.log("Import committed. SQLite source and consistent backup preserved.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); sqlite.close(); }
}
main().catch(() => {
  console.error("Migration failed. No source data was changed. Check target connectivity and schema before retrying.");
  process.exitCode = 1;
}).finally(() => pool.end());
