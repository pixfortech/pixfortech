// Runs only against an isolated local/QA PostgreSQL. Fixtures are created and removed here.
import assert from "node:assert/strict";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../src/server/db";
import { checkSlug, checkUsername, getPublicProfile, isSlugAvailable, listPublicProfiles, resolveSlugRedirect, setPublicSlug, setPublished, setUsername, updateProfile } from "../src/server/services/profile";
import type { Actor } from "../src/server/auth/permissions";

const url = process.env.DATABASE_URL ?? "";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname) || process.env.QA_DISPOSABLE_DATABASE === "true", "Never run this suite against production");

const tag = randomUUID().slice(0, 8);
const studioId = randomUUID(), clientOrgId = randomUUID();
const staff: Actor & { name: string } = { id: randomUUID(), role: "team_member", organisationId: studioId, name: `Slug Tester ${tag}` };
const other: Actor & { name: string } = { id: randomUUID(), role: "project_manager", organisationId: studioId, name: `Other Staff ${tag}` };
const client: Actor & { name: string } = { id: randomUUID(), role: "client_admin", organisationId: clientOrgId, name: `Client Person ${tag}` };
const admin: Actor & { name: string } = { id: randomUUID(), role: "admin", organisationId: studioId, name: `Admin ${tag}` };

beforeAll(async () => {
  await db.insert(schema.organisations).values([{ id: studioId, name: `Studio ${tag}`, slug: `studio-${tag}`, kind: "studio" }, { id: clientOrgId, name: `Client ${tag}`, slug: `client-${tag}`, kind: "client" }]);
  await db.insert(schema.users).values([staff, other, client, admin].map((u) => ({ id: u.id, name: u.name, email: `${u.id}@example.test`, role: u.role, organisationId: u.organisationId })));
});
afterAll(async () => {
  await db.delete(schema.auditEvents).where(inArray(schema.auditEvents.actorId, [staff.id, other.id, client.id, admin.id]));
  await db.delete(schema.users).where(inArray(schema.users.id, [staff.id, other.id, client.id, admin.id]));
  await db.delete(schema.organisations).where(inArray(schema.organisations.id, [studioId, clientOrgId]));
});

describe("usernames", () => {
  it("are unique case-insensitively", async () => {
    await setUsername(staff, staff.id, `Forger_${tag}`);
    expect((await checkUsername(other, `forger_${tag}`)).ok).toBe(false);
    await expect(setUsername(other, other.id, `FORGER_${tag}`)).rejects.toThrow(/already forged/);
    expect((await checkUsername(staff, `forger_${tag}`)).ok).toBe(true); // your own is fine
  });
  it("rejects reserved names and other people's accounts", async () => {
    await expect(setUsername(staff, staff.id, "admin")).rejects.toThrow();
    await expect(setUsername(staff, other.id, `x_${tag}`)).rejects.toThrow(/own profile/);
  });
});

describe("public slugs and history", () => {
  const first = `aman-chaurasia-${tag}`, second = `aman-rahul-chaurasia-${tag}`, third = `a-r-c-${tag}`;
  it("stay private until published, then resolve", async () => {
    await setPublicSlug(staff, staff.id, first);
    expect(await getPublicProfile(first)).toBeNull();
    await setPublished(staff, staff.id, true);
    expect((await getPublicProfile(first))?.name).toBe(staff.name);
  });
  it("redirect old slugs permanently and single-hop after several changes", async () => {
    await setPublicSlug(staff, staff.id, second);
    expect(await getPublicProfile(first)).toBeNull();
    expect(await resolveSlugRedirect(first)).toBe(second);
    await setPublicSlug(staff, staff.id, third);
    expect(await resolveSlugRedirect(first)).toBe(third);
    expect(await resolveSlugRedirect(second)).toBe(third);
    expect(await resolveSlugRedirect(third)).toBeNull();
  });
  it("prevent collisions with current and historic slugs", async () => {
    expect(await isSlugAvailable(first, other.id)).toBe(false);
    expect(await isSlugAvailable(third, other.id)).toBe(false);
    expect((await checkSlug(other, second)).ok).toBe(false);
    await expect(setPublicSlug(other, other.id, first)).rejects.toThrow(/belongs to someone else/);
    // The owner may take a former slug back; it leaves history.
    await setPublicSlug(staff, staff.id, first);
    expect(await resolveSlugRedirect(first)).toBeNull();
    expect(await resolveSlugRedirect(third)).toBe(first);
  });
  it("hide redirects and listings once unpublished", async () => {
    await setPublished(staff, staff.id, false);
    expect(await resolveSlugRedirect(third)).toBeNull();
    expect((await listPublicProfiles()).some((p) => p.id === staff.id)).toBe(false);
    await setPublished(staff, staff.id, true);
    expect((await listPublicProfiles()).some((p) => p.id === staff.id)).toBe(true);
  });
  it("never publish client accounts", async () => {
    await expect(setPublicSlug(client, client.id, `client-${tag}`)).rejects.toThrow(/Client accounts/);
    await expect(setPublished(client, client.id, true)).rejects.toThrow();
    expect((await listPublicProfiles()).some((p) => p.id === client.id)).toBe(false);
  });
  it("let admins edit staff identity but not clients' private profiles", async () => {
    await setPublicSlug(admin, other.id, `other-${tag}`);
    await expect(updateProfile(admin, client.id, { title: "x" })).rejects.toThrow(/own profile/);
    await expect(updateProfile(other, staff.id, { title: "x" })).rejects.toThrow(/own profile/);
  });
  it("never let identity edits touch role or organisation", async () => {
    await updateProfile(staff, staff.id, { name: "Slug Tester Renamed", bio: "<script>alert(1)</script>plain", linkedinUrl: "linkedin.com/in/tester" });
    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, staff.id));
    expect(row.role).toBe("team_member");
    expect(row.organisationId).toBe(studioId);
    expect(row.bio).toBe("alert(1)plain");
    expect(row.linkedinUrl).toBe("https://linkedin.com/in/tester");
  });
});
