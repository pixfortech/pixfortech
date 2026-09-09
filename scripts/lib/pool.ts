import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import ws from "ws";

/**
 * A direct (non-pooler) connection for migrations and one-off administration.
 * Neon over WebSocket for hosted databases; node-postgres for a local server.
 */
export function isLocal(url: string): boolean {
  if (process.env.DATABASE_DRIVER === "pg") return true;
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname); } catch { return false; }
}

export function directUrl(): string {
  const url = process.env.DATABASE_URL_UNPOOLED ?? (process.env.DATABASE_URL && isLocal(process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined);
  if (!url || new URL(url).hostname.includes("-pooler")) throw new Error("A direct DATABASE_URL_UNPOOLED is required.");
  return url;
}

/** Both pools expose the same connect/query/end surface; callers use the node-postgres types. */
export function createPool(url: string): PgPool {
  if (isLocal(url)) return new PgPool({ connectionString: url, max: 3 });
  neonConfig.webSocketConstructor = ws;
  return new NeonPool({ connectionString: url }) as unknown as PgPool;
}
