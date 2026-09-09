// Owner bootstrap scenarios A–E against an isolated local PostgreSQL. Never run against production.
import assert from "node:assert/strict";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { generateTemporaryPassword, listSuperAdmins, runBootstrap } from "./lib/bootstrap";
import { verifyPassword } from "better-auth/crypto";

const url = process.env.DATABASE_URL ?? "";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname), "Never run this suite against production");

const pool = new Pool({ connectionString: url, max: 2 });
const tag = Date.now().toString(36);
const email = `owner-${tag}@example.test`;
let parked: { id: string; email: string }[] = [];

beforeAll(async () => {
  // Park any existing super admins (the demo fixture has one) so scenario A starts from none. Restored afterwards.
  parked = (await pool.query<{ id: string; email: string }>(`SELECT id, email FROM "user" WHERE role = 'super_admin'`)).rows;
  await pool.query(`UPDATE "user" SET role = 'admin' WHERE role = 'super_admin'`);
});
afterAll(async () => {
  await pool.query(`DELETE FROM audit_events WHERE action = 'admin.bootstrap' AND target_id IN (SELECT id FROM "user" WHERE email LIKE $1)`, [`owner-${tag}%`]);
  await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`owner-${tag}%`]);
  for (const p of parked) await pool.query(`UPDATE "user" SET role = 'super_admin' WHERE id = $1`, [p.id]);
  await pool.end();
});

describe("admin bootstrap", () => {
  it("D: refuses to guess the owner when the email is missing", async () => {
    await expect(runBootstrap(pool, { email: undefined, name: "Owner" })).rejects.toThrow(/BOOTSTRAP_ADMIN_EMAIL/);
    await expect(runBootstrap(pool, { email: "not-an-email", name: "Owner" })).rejects.toThrow(/valid address/);
    await expect(runBootstrap(pool, { email, name: "" })).rejects.toThrow(/BOOTSTRAP_ADMIN_NAME/);
    expect(await listSuperAdmins(pool)).toHaveLength(0);
  });
  it("A: creates exactly one super admin with a long temporary password that must be changed", async () => {
    const r = await runBootstrap(pool, { email, name: "Test Owner" });
    expect(r.action).toBe("created");
    if (r.action !== "created") return;
    expect(r.temporaryPassword.length).toBeGreaterThanOrEqual(20);
    const admins = await listSuperAdmins(pool);
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({ email, enabled: true, emailVerified: true });
    const [row] = (await pool.query(`SELECT u.must_change_password, a.password FROM "user" u JOIN account a ON a.user_id = u.id WHERE u.email = $1`, [email])).rows;
    expect(row.must_change_password).toBe(true);
    // E: only a hash is stored, and it matches the one-time credential.
    expect(row.password).not.toContain(r.temporaryPassword);
    expect(await verifyPassword({ hash: row.password, password: r.temporaryPassword })).toBe(true);
    const audit = await pool.query(`SELECT metadata FROM audit_events WHERE action = 'admin.bootstrap'`);
    expect(JSON.stringify(audit.rows)).not.toContain(r.temporaryPassword);
  });
  it("B and C: a second run, even with a different email, creates nothing", async () => {
    const r1 = await runBootstrap(pool, { email, name: "Test Owner" });
    expect(r1.action).toBe("exists");
    const r2 = await runBootstrap(pool, { email: `owner-${tag}-other@example.test`, name: "Someone Else" });
    expect(r2.action).toBe("exists");
    expect(await listSuperAdmins(pool)).toHaveLength(1);
  });
  it("check mode reports without creating", async () => {
    const r = await runBootstrap(pool, { check: true });
    expect(r.action).toBe("exists");
    if (r.action === "exists") expect(r.admins[0].email).toBe(email);
  });
  it("F: with verification required the owner starts unverified and the audit row says so", async () => {
    await pool.query(`DELETE FROM audit_events WHERE action = 'admin.bootstrap' AND target_id IN (SELECT id FROM "user" WHERE email = $1)`, [email]);
    await pool.query(`DELETE FROM "user" WHERE email = $1`, [email]);
    const r = await runBootstrap(pool, { email, name: "Test Owner", requireVerification: true });
    expect(r.action).toBe("created");
    if (r.action !== "created") return;
    expect(r.emailVerified).toBe(false);
    expect(await listSuperAdmins(pool)).toMatchObject([{ email, enabled: true, emailVerified: false }]);
    const audit = await pool.query(`SELECT metadata FROM audit_events WHERE action = 'admin.bootstrap' AND target_id = (SELECT id FROM "user" WHERE email = $1)`, [email]);
    const meta = typeof audit.rows[0].metadata === "string" ? JSON.parse(audit.rows[0].metadata) : audit.rows[0].metadata;
    expect(meta).toMatchObject({ verification: "pending" });
    expect(JSON.stringify(audit.rows)).not.toContain(r.temporaryPassword);
  });
  it("generates distinct passwords of at least 20 characters", () => {
    const a = generateTemporaryPassword(), b = generateTemporaryPassword();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
  });
});
