import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

/**
 * Production talks to Neon over HTTP: queries do not keep sockets alive in
 * suspended serverless instances. A plain local PostgreSQL (development, CI,
 * isolated QA) uses node-postgres instead; both expose the same Drizzle API
 * surface used by the services. Static builds never connect or migrate.
 */
export function isLocalDatabase(url: string): boolean {
  if (process.env.DATABASE_DRIVER === "pg") return true;
  if (process.env.DATABASE_DRIVER === "neon") return false;
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname); } catch { return false; }
}

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  if (isLocalDatabase(url)) {
    // Loaded lazily so the serverless bundle never initialises a socket pool.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema }) as unknown as Db;
  }
  return drizzleNeon(neon(url), { schema });
}

let instance: Db | undefined;
export const db: Db = new Proxy({} as Db, {
  get(_, key) {
    instance ??= create();
    const value = Reflect.get(instance, key);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
export { schema };
