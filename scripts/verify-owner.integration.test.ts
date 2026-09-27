// Owner verification repair against an isolated local PostgreSQL. Never run against production.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPool, directUrl } from "./lib/pool";
import { requireIsolatedQaDatabase } from "./lib/qa-database";
import { verifyOwnerEmail } from "./lib/verify-owner";

requireIsolatedQaDatabase();

const pool = createPool(directUrl());
const tag = randomUUID().slice(0, 8);
const owner = { id: randomUUID(), email: `owner_${tag}@example.test` };
const member = { id: randomUUID(), email: `member-${tag}@example.test` };
const userCount = async () => Number((await pool.query(`SELECT count(*) FROM "user"`)).rows[0].count);
const row = async (id: string) => (await pool.query(`SELECT role, email_verified, disabled FROM "user" WHERE id = $1`, [id])).rows[0];
const audits = async (id: string) => Number((await pool.query(`SELECT count(*) FROM audit_events WHERE action = 'admin.email_verified_repair' AND target_id = $1`, [id])).rows[0].count);

beforeAll(async () => {
  await pool.query(`INSERT INTO "user" (id, name, email, email_verified, role) VALUES ($1, 'Repair Owner', $2, false, 'super_admin'), ($3, 'Repair Member', $4, false, 'client_member')`, [owner.id, owner.email, member.id, member.email]);
});
afterAll(async () => {
  await pool.query(`DELETE FROM audit_events WHERE target_id = ANY($1)`, [[owner.id, member.id]]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [[owner.id, member.id]]);
  await pool.end();
});

describe("owner verification repair", () => {
  it("refuses missing, wildcard, unknown and non-owner targets without writing anything", async () => {
    const before = await userCount();
    await expect(verifyOwnerEmail(pool, { email: "" , confirm: true, reason: "evidence here" })).rejects.toThrow(/required/);
    await expect(verifyOwnerEmail(pool, { email: "%@example.test", confirm: true, reason: "evidence here" })).rejects.toThrow(/wildcards/);
    await expect(verifyOwnerEmail(pool, { email: "*", confirm: true, reason: "evidence here" })).rejects.toThrow(/wildcards/);
    await expect(verifyOwnerEmail(pool, { email: `nobody-${tag}@example.test`, confirm: true, reason: "evidence here" })).rejects.toThrow(/never creates users/);
    await expect(verifyOwnerEmail(pool, { email: member.email, confirm: true, reason: "evidence here" })).rejects.toThrow(/never changes roles/);
    await expect(verifyOwnerEmail(pool, { email: owner.email, userId: member.id, confirm: true, reason: "evidence here" })).rejects.toThrow(/does not match/);
    await expect(verifyOwnerEmail(pool, { email: owner.email, confirm: true })).rejects.toThrow(/--reason/);
    expect(await userCount()).toBe(before);
    expect(await row(member.id)).toMatchObject({ role: "client_member", email_verified: false });
    expect(await row(owner.id)).toMatchObject({ role: "super_admin", email_verified: false });
  });
  it("dry-runs by default", async () => {
    expect((await verifyOwnerEmail(pool, { email: owner.email.toUpperCase() })).action).toBe("would-verify");
    expect((await row(owner.id)).email_verified).toBe(false);
  });
  it("verifies the explicit owner once, audits it, and is idempotent", async () => {
    const r = await verifyOwnerEmail(pool, { email: owner.email, userId: owner.id, reason: "owner opened reset link", confirm: true });
    expect(r).toEqual({ action: "verified", id: owner.id, email: owner.email });
    expect(await row(owner.id)).toMatchObject({ role: "super_admin", email_verified: true, disabled: false });
    expect(await audits(owner.id)).toBe(1);
    const again = await verifyOwnerEmail(pool, { email: owner.email, userId: owner.id, reason: "owner opened reset link", confirm: true });
    expect(again.action).toBe("unchanged");
    expect(await audits(owner.id)).toBe(1);
  });
});
