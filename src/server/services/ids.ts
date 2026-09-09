import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "../db";

export const uid = () => crypto.randomUUID();

/** Atomic monotonic counter for human identifiers (PF-0042, PF-REQ-0142, PF-0042-17). */
export async function nextNumber(name: string): Promise<number> {
  const [row] = await db.insert(schema.counters).values({ name, value: 1 })
    .onConflictDoUpdate({ target: schema.counters.name, set: { value: sql`${schema.counters.value} + 1` } })
    .returning({ value: schema.counters.value });
  return row.value;
}

export const pad = (n: number, width = 4) => String(n).padStart(width, "0");
export const projectCode = (n: number) => `PF-${pad(n)}`;
export const requestCode = (n: number) => `PF-REQ-${pad(n)}`;
