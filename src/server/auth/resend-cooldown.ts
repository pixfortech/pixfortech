import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";

/**
 * One verification resend per address per minute, shared by every instance
 * through the auth rate-limit table. Keyed by a hash so addresses are never
 * stored in the clear. The window only starts once the provider accepted the
 * email, so a failed send can be retried straight away.
 */
export const RESEND_COOLDOWN_SECONDS = 60;
const PREFIX = "verify-resend:";

export function resendKey(email: string): string {
  return PREFIX + createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** Seconds left before this address may be sent another verification email (0 = allowed now). */
export async function resendCooldownRemaining(email: string, now = Date.now()): Promise<number> {
  const [row] = await db.select({ lastRequest: schema.rateLimit.lastRequest }).from(schema.rateLimit).where(eq(schema.rateLimit.key, resendKey(email))).limit(1);
  if (!row) return 0;
  const left = row.lastRequest + RESEND_COOLDOWN_SECONDS * 1000 - now;
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

export async function startResendCooldown(email: string, now = Date.now()): Promise<void> {
  const key = resendKey(email);
  await db.insert(schema.rateLimit).values({ key, count: 1, lastRequest: now })
    .onConflictDoUpdate({ target: schema.rateLimit.key, set: { count: 1, lastRequest: now } });
}
