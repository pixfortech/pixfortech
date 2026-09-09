import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Pool } from "pg";

/**
 * Idempotent owner bootstrap. Creates the first super_admin only when none
 * exists; otherwise reports the existing one and changes nothing. Identity
 * comes from the environment, never from source. The temporary password is
 * generated here, returned once to the caller, and never stored in plain
 * text or logged by this module.
 */
export type BootstrapInput = { email?: string | null; name?: string | null; check?: boolean };
export type SuperAdminSummary = { email: string; enabled: boolean; emailVerified: boolean; createdAt: string };
export type BootstrapResult =
  | { action: "exists"; admins: SuperAdminSummary[] }
  | { action: "created"; email: string; temporaryPassword: string }
  | { action: "none" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateTemporaryPassword(): string {
  // 30 base64url characters from 22 random bytes: comfortably over the 20-character minimum.
  return randomBytes(22).toString("base64url").slice(0, 30);
}

export async function listSuperAdmins(pool: Pool): Promise<SuperAdminSummary[]> {
  const res = await pool.query<{ email: string; disabled: boolean; email_verified: boolean; created_at: Date }>(
    `SELECT email, disabled, email_verified, created_at FROM "user" WHERE role = 'super_admin' ORDER BY created_at`,
  );
  return res.rows.map((r) => ({ email: r.email, enabled: !r.disabled, emailVerified: r.email_verified, createdAt: r.created_at.toISOString() }));
}

export async function runBootstrap(pool: Pool, input: BootstrapInput): Promise<BootstrapResult> {
  const existing = await listSuperAdmins(pool);
  if (input.check) return existing.length ? { action: "exists", admins: existing } : { action: "none" };
  if (existing.some((a) => a.enabled)) return { action: "exists", admins: existing };

  const email = input.email?.trim().toLowerCase();
  const name = input.name?.trim();
  if (!email || !EMAIL.test(email)) throw new Error("BOOTSTRAP_ADMIN_EMAIL is required and must be a valid address. Nothing was created.");
  if (!name || name.length < 2) throw new Error("BOOTSTRAP_ADMIN_NAME is required. Nothing was created.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialise concurrent runs: the second one sees the first one's owner and exits.
    await client.query('LOCK TABLE "user" IN EXCLUSIVE MODE');
    const again = await client.query(`SELECT 1 FROM "user" WHERE role = 'super_admin' AND disabled = false LIMIT 1`);
    if (again.rowCount) { await client.query("ROLLBACK"); return { action: "exists", admins: await listSuperAdmins(pool) }; }
    const taken = await client.query(`SELECT id, role FROM "user" WHERE email = $1`, [email]);
    if (taken.rowCount) { await client.query("ROLLBACK"); throw new Error(`An account already exists for ${email} with role ${taken.rows[0].role}. Refusing to escalate it automatically; promote it deliberately through the team screen or a reviewed migration.`); }

    let orgId = (await client.query<{ id: string }>(`SELECT id FROM organisations WHERE kind = 'studio' ORDER BY created_at LIMIT 1`)).rows[0]?.id;
    if (!orgId) {
      orgId = randomUUID();
      await client.query(`INSERT INTO organisations (id, name, slug, kind, website) VALUES ($1, $2, $3, 'studio', $4)`, [orgId, "Pixel Forge Technologies", "pixel-forge", "https://pixfortech.com"]);
    }
    const userId = randomUUID();
    const temporaryPassword = generateTemporaryPassword();
    const hash = await hashPassword(temporaryPassword);
    // The address came from the operator's own environment, so it is treated as verified for the first sign-in;
    // the temporary password must be replaced before anything else can be used.
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, role, organisation_id, must_change_password) VALUES ($1, $2, $3, true, 'super_admin', $4, true)`,
      [userId, name, email, orgId],
    );
    await client.query(`INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, 'credential', $2, $3)`, [randomUUID(), userId, hash]);
    await client.query(`INSERT INTO audit_events (id, actor_id, action, target_type, target_id, metadata) VALUES ($1, NULL, 'admin.bootstrap', 'user', $2, $3)`, [randomUUID(), userId, JSON.stringify({ email, method: "temporary-password" })]);
    await client.query("COMMIT");
    return { action: "created", email, temporaryPassword };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
