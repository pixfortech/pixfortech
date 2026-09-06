import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db";

export const uid = () => crypto.randomUUID();

/** Atomic monotonic counter for human identifiers (PF-0042, PF-REQ-0142, PF-0042-17). */
export function nextNumber(name: string): number {
  return db.transaction((tx) => {
    tx.insert(schema.counters).values({ name, value: 0 }).onConflictDoNothing().run();
    tx.update(schema.counters).set({ value: sql`${schema.counters.value} + 1` }).where(eq(schema.counters.name, name)).run();
    const row = tx.select({ value: schema.counters.value }).from(schema.counters).where(eq(schema.counters.name, name)).get();
    return row?.value ?? 1;
  });
}

export const pad = (n: number, width = 4) => String(n).padStart(width, "0");
export const projectCode = (n: number) => `PF-${pad(n)}`;
export const requestCode = (n: number) => `PF-REQ-${pad(n)}`;
