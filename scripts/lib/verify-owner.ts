import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

/**
 * One-time repair for an owner whose inbox is proven but whose row still says
 * email_verified=false. Deliberately narrow: one explicit address, an
 * existing enabled super_admin only, never creates or re-roles anyone, and
 * writes an audit event. Dry run unless `confirm` is set. Running it again on
 * a verified owner changes nothing.
 */
export type VerifyOwnerInput = { email?: string | null; userId?: string | null; reason?: string | null; confirm?: boolean };
export type VerifyOwnerResult =
  | { action: "unchanged"; id: string; email: string }
  | { action: "would-verify"; id: string; email: string }
  | { action: "verified"; id: string; email: string };

const EMAIL = /^[^\s@%*?]+@[^\s@%*?]+\.[^\s@%*?]+$/;

export async function verifyOwnerEmail(pool: Pool, input: VerifyOwnerInput): Promise<VerifyOwnerResult> {
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email) throw new Error("--email=<owner address> is required. Nothing was changed.");
  if (/[%*?]/.test(email) || !EMAIL.test(email)) throw new Error("Give one exact address; patterns and wildcards are refused. Nothing was changed.");
  const reason = input.reason?.trim() ?? "";
  if (input.confirm && reason.length < 8) throw new Error("--reason=<why the inbox is known to be verified> is required with --confirm. Nothing was changed.");

  const rows = (await pool.query<{ id: string; email: string; role: string; disabled: boolean; email_verified: boolean }>(
    `SELECT id, email, role, disabled, email_verified FROM "user" WHERE lower(email) = $1`, [email],
  )).rows;
  if (rows.length === 0) throw new Error(`No account exists for ${email}. This script never creates users. Nothing was changed.`);
  if (rows.length > 1) throw new Error(`${rows.length} accounts share ${email}; resolve the duplicate first. Nothing was changed.`);
  const [user] = rows;
  if (input.userId && input.userId !== user.id) throw new Error(`--user-id does not match the account for ${email}. Nothing was changed.`);
  if (user.role !== "super_admin") throw new Error(`${email} is not the owner (role ${user.role}); this repair is for the Super Admin only and never changes roles. Nothing was changed.`);
  if (user.disabled) throw new Error(`${email} is disabled. Re-enable it deliberately first. Nothing was changed.`);

  if (user.email_verified) return { action: "unchanged", id: user.id, email: user.email };
  if (!input.confirm) return { action: "would-verify", id: user.id, email: user.email };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(`UPDATE "user" SET email_verified = true, updated_at = now() WHERE id = $1 AND role = 'super_admin' AND email_verified = false`, [user.id]);
    if (updated.rowCount) {
      await client.query(
        `INSERT INTO audit_events (id, actor_id, action, target_type, target_id, metadata) VALUES ($1, NULL, 'admin.email_verified_repair', 'user', $2, $3)`,
        [randomUUID(), user.id, JSON.stringify({ email: user.email, reason, method: "script" })],
      );
    }
    await client.query("COMMIT");
    return updated.rowCount ? { action: "verified", id: user.id, email: user.email } : { action: "unchanged", id: user.id, email: user.email };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
