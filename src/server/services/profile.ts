import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { AuthError } from "../auth/session";
import { isAdmin, isStaff, type Actor } from "../auth/permissions";
import { STAFF_ROLES } from "../db/schema";
import { cleanBio, suggestSlug, suggestUsername, validateSlug, validateSocialUrl, validateUsername } from "@/lib/profile/identity";
import { recordAudit } from "./activity";
import { uid } from "./ids";

/**
 * Professional profile: display identity, username, public slug and the
 * published staff page. Authorisation never reads any of these fields; the
 * immutable user id remains the identity everywhere else.
 */

export type ProfileInput = {
  name?: string; displayName?: string | null; title?: string | null; timezone?: string | null; bio?: string | null;
  linkedinUrl?: string | null; githubUrl?: string | null; websiteUrl?: string | null;
};

export async function getProfile(userId: string) {
  const [row] = await db.select({
    id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, image: schema.users.image, title: schema.users.title, timezone: schema.users.timezone,
    username: schema.users.username, publicSlug: schema.users.publicSlug, publicProfile: schema.users.publicProfile, displayName: schema.users.displayName, bio: schema.users.bio,
    linkedinUrl: schema.users.linkedinUrl, githubUrl: schema.users.githubUrl, websiteUrl: schema.users.websiteUrl, avatarKey: schema.users.avatarKey, avatarMime: schema.users.avatarMime,
    mustChangePassword: schema.users.mustChangePassword, organisationId: schema.users.organisationId, createdAt: schema.users.createdAt,
  }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return row ?? null;
}

/** Who may publish a public profile: staff only. Clients are private by design. */
export const canPublishProfile = (a: Actor) => isStaff(a);

/** Admins may edit any staff profile's public identity (slug, publish state); everyone edits their own. */
function assertCanEdit(actor: Actor, targetId: string, targetRole: string) {
  if (actor.id === targetId) return;
  if (isAdmin(actor) && STAFF_ROLES.includes(targetRole as (typeof STAFF_ROLES)[number])) return;
  throw new AuthError(403, "You can only edit your own profile.");
}

async function loadTarget(id: string) {
  const [t] = await db.select({ id: schema.users.id, role: schema.users.role, username: schema.users.username, publicSlug: schema.users.publicSlug, publicProfile: schema.users.publicProfile, name: schema.users.name }).from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!t) throw new AuthError(404, "Profile not found.");
  return t;
}

export async function updateProfile(actor: Actor, targetId: string, patch: ProfileInput) {
  const target = await loadTarget(targetId);
  assertCanEdit(actor, target.id, target.role);
  const set: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) { const v = patch.name.trim(); if (v.length < 2 || v.length > 80) throw new AuthError(422, "Name must be between 2 and 80 characters."); set.name = v; }
  if (patch.displayName !== undefined) { const v = (patch.displayName ?? "").trim(); if (v.length > 60) throw new AuthError(422, "Display name is too long."); set.displayName = v || null; }
  if (patch.title !== undefined) set.title = (patch.title ?? "").trim().slice(0, 80) || null;
  if (patch.timezone !== undefined) {
    const v = (patch.timezone ?? "").trim();
    if (v && !isValidTimezone(v)) throw new AuthError(422, "Use an IANA timezone such as Europe/London.");
    set.timezone = v || null;
  }
  if (patch.bio !== undefined) set.bio = cleanBio(patch.bio ?? "") || null;
  for (const [key, kind] of [["linkedinUrl", "linkedin"], ["githubUrl", "github"], ["websiteUrl", "website"]] as const) {
    if (patch[key] !== undefined) {
      const check = validateSocialUrl(kind, patch[key] ?? "");
      if (!check.ok) throw new AuthError(422, check.reason);
      set[key] = check.value || null;
    }
  }
  await db.update(schema.users).set(set).where(eq(schema.users.id, target.id));
  if (actor.id !== target.id) await recordAudit({ actorId: actor.id, action: "profile.update", targetType: "user", targetId: target.id, metadata: { fields: Object.keys(set) } });
}

export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

/** Case-insensitive uniqueness is guaranteed by storing the normalised form and a unique index. */
export async function isUsernameAvailable(username: string, exceptUserId?: string): Promise<boolean> {
  const conds = [eq(schema.users.username, username)];
  if (exceptUserId) conds.push(ne(schema.users.id, exceptUserId));
  const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(and(...conds)).limit(1);
  return !row;
}

export async function isSlugAvailable(slug: string, exceptUserId?: string): Promise<boolean> {
  const conds = [eq(schema.users.publicSlug, slug)];
  if (exceptUserId) conds.push(ne(schema.users.id, exceptUserId));
  const [current] = await db.select({ id: schema.users.id }).from(schema.users).where(and(...conds)).limit(1);
  if (current) return false;
  // A slug someone else once held keeps redirecting to them; it cannot be reassigned.
  const hconds = [eq(schema.profileSlugHistory.slug, slug)];
  if (exceptUserId) hconds.push(ne(schema.profileSlugHistory.userId, exceptUserId));
  const [historic] = await db.select({ id: schema.profileSlugHistory.id }).from(schema.profileSlugHistory).where(and(...hconds)).limit(1);
  return !historic;
}

export type IdentityStatus = { ok: boolean; value: string; reason?: string };

/** Live validation for the editor: format first, then availability. */
export async function checkUsername(actor: Actor, raw: string): Promise<IdentityStatus> {
  const v = validateUsername(raw);
  if (!v.ok) return { ok: false, value: raw, reason: v.reason };
  if (!(await isUsernameAvailable(v.value, actor.id))) return { ok: false, value: v.value, reason: "Someone else already forged that username." };
  return { ok: true, value: v.value };
}

export async function checkSlug(actor: Actor, raw: string): Promise<IdentityStatus> {
  const v = validateSlug(raw);
  if (!v.ok) return { ok: false, value: raw, reason: v.reason };
  if (!(await isSlugAvailable(v.value, actor.id))) return { ok: false, value: v.value, reason: "That address belongs to someone else." };
  return { ok: true, value: v.value };
}

export async function setUsername(actor: Actor, targetId: string, raw: string) {
  const target = await loadTarget(targetId);
  assertCanEdit(actor, target.id, target.role);
  const v = validateUsername(raw);
  if (!v.ok) throw new AuthError(422, v.reason);
  if (v.value === target.username) return v.value;
  if (!(await isUsernameAvailable(v.value, target.id))) throw new AuthError(422, "Someone else already forged that username.");
  await db.update(schema.users).set({ username: v.value, updatedAt: new Date() }).where(eq(schema.users.id, target.id));
  await recordAudit({ actorId: actor.id, action: "profile.username", targetType: "user", targetId: target.id, metadata: { from: target.username, to: v.value } });
  return v.value;
}

/**
 * Changes the public slug and records the previous one so old links keep
 * working. History rows are unique per slug: a slug can only ever point at
 * one person.
 */
export async function setPublicSlug(actor: Actor, targetId: string, raw: string) {
  const target = await loadTarget(targetId);
  assertCanEdit(actor, target.id, target.role);
  if (!STAFF_ROLES.includes(target.role)) throw new AuthError(403, "Client accounts do not have public profile addresses.");
  const v = validateSlug(raw);
  if (!v.ok) throw new AuthError(422, v.reason);
  if (v.value === target.publicSlug) return v.value;
  if (!(await isSlugAvailable(v.value, target.id))) throw new AuthError(422, "That address belongs to someone else.");
  const previous = target.publicSlug;
  // Reclaiming one of your own former slugs removes it from history first.
  await db.delete(schema.profileSlugHistory).where(and(eq(schema.profileSlugHistory.userId, target.id), eq(schema.profileSlugHistory.slug, v.value)));
  await db.update(schema.users).set({ publicSlug: v.value, updatedAt: new Date() }).where(eq(schema.users.id, target.id));
  if (previous) {
    await db.insert(schema.profileSlugHistory).values({ id: uid(), userId: target.id, slug: previous, replacedBy: v.value })
      .onConflictDoUpdate({ target: schema.profileSlugHistory.slug, set: { replacedBy: v.value, createdAt: new Date() } });
    // Older history entries now point at the newest slug so redirects are single-hop.
    await db.update(schema.profileSlugHistory).set({ replacedBy: v.value }).where(eq(schema.profileSlugHistory.userId, target.id));
  }
  await recordAudit({ actorId: actor.id, action: "profile.slug", targetType: "user", targetId: target.id, metadata: { from: previous, to: v.value } });
  return v.value;
}

export async function setPublished(actor: Actor, targetId: string, published: boolean) {
  const target = await loadTarget(targetId);
  assertCanEdit(actor, target.id, target.role);
  if (published && !STAFF_ROLES.includes(target.role)) throw new AuthError(403, "Client profiles stay private.");
  if (published && !target.publicSlug) throw new AuthError(422, "Choose a profile address before publishing.");
  await db.update(schema.users).set({ publicProfile: published, updatedAt: new Date() }).where(eq(schema.users.id, target.id));
  await recordAudit({ actorId: actor.id, action: published ? "profile.publish" : "profile.unpublish", targetType: "user", targetId: target.id });
}

/** First-time defaults so the editor never opens empty. Never overwrites a chosen value. */
export async function ensureIdentityDefaults(userId: string) {
  const target = await loadTarget(userId);
  const set: Partial<typeof schema.users.$inferInsert> = {};
  if (!target.username) {
    for (let i = 0; i < 20; i++) { const c = suggestUsername(target.name, i); if (validateUsername(c).ok && (await isUsernameAvailable(c))) { set.username = c; break; } }
  }
  if (!target.publicSlug && STAFF_ROLES.includes(target.role)) {
    for (let i = 0; i < 20; i++) { const c = suggestSlug(target.name, i); if (validateSlug(c).ok && (await isSlugAvailable(c))) { set.publicSlug = c; break; } }
  }
  if (Object.keys(set).length) await db.update(schema.users).set(set).where(eq(schema.users.id, userId));
  return set;
}

// ---------------------------------------------------------------- public reads

export type PublicProfile = {
  id: string; slug: string; name: string; title: string | null; bio: string | null; linkedinUrl: string | null; githubUrl: string | null; websiteUrl: string | null;
  hasAvatar: boolean; avatarVersion: number; since: Date;
};

const publicColumns = {
  id: schema.users.id, slug: schema.users.publicSlug, name: schema.users.name, displayName: schema.users.displayName, title: schema.users.title, bio: schema.users.bio,
  linkedinUrl: schema.users.linkedinUrl, githubUrl: schema.users.githubUrl, websiteUrl: schema.users.websiteUrl, avatarKey: schema.users.avatarKey, updatedAt: schema.users.updatedAt, createdAt: schema.users.createdAt,
};
function toPublic(r: { id: string; slug: string | null; name: string; displayName: string | null; title: string | null; bio: string | null; linkedinUrl: string | null; githubUrl: string | null; websiteUrl: string | null; avatarKey: string | null; updatedAt: Date; createdAt: Date }): PublicProfile {
  return { id: r.id, slug: r.slug!, name: r.displayName?.trim() || r.name, title: r.title, bio: r.bio, linkedinUrl: r.linkedinUrl, githubUrl: r.githubUrl, websiteUrl: r.websiteUrl, hasAvatar: Boolean(r.avatarKey), avatarVersion: r.updatedAt.getTime(), since: r.createdAt };
}

/** Only published, enabled staff accounts are visible. Everyone else answers "not found" — never "private". */
const publishedWhere = () => and(eq(schema.users.publicProfile, true), eq(schema.users.disabled, false), sql`${schema.users.role} in ('super_admin','admin','project_manager','team_member')`);

export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const [row] = await db.select(publicColumns).from(schema.users).where(and(eq(schema.users.publicSlug, slug), publishedWhere())).limit(1);
  return row ? toPublic(row) : null;
}

/** Owner (or an admin, for staff) can preview an unpublished page. Never listed, never indexed. */
export async function getProfilePreview(slug: string, viewer: Actor | null): Promise<PublicProfile | null> {
  if (!viewer) return null;
  const [row] = await db.select({ ...publicColumns, role: schema.users.role }).from(schema.users).where(and(eq(schema.users.publicSlug, slug), eq(schema.users.disabled, false))).limit(1);
  if (!row || !STAFF_ROLES.includes(row.role)) return null;
  if (row.id !== viewer.id && !isAdmin(viewer)) return null;
  return toPublic(row);
}

/** A former slug resolves to the current one only when the profile is still published. */
export async function resolveSlugRedirect(slug: string): Promise<string | null> {
  const [h] = await db.select({ userId: schema.profileSlugHistory.userId }).from(schema.profileSlugHistory).where(eq(schema.profileSlugHistory.slug, slug)).limit(1);
  if (!h) return null;
  const [u] = await db.select({ slug: schema.users.publicSlug }).from(schema.users).where(and(eq(schema.users.id, h.userId), publishedWhere())).limit(1);
  return u?.slug ?? null;
}

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  const rows = await db.select(publicColumns).from(schema.users).where(and(publishedWhere(), sql`${schema.users.publicSlug} is not null`)).orderBy(schema.users.name);
  return rows.map(toPublic);
}

// ---------------------------------------------------------------- avatars

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/** Validates by magic bytes only; the declared type and filename are ignored. */
export function validateAvatar(buf: Buffer): { ok: true; mime: string; ext: string } | { ok: false; reason: string } {
  if (!buf.length) return { ok: false, reason: "The file is empty." };
  if (buf.length > AVATAR_MAX_BYTES) return { ok: false, reason: "Keep it under 2 MB." };
  const mime = sniffImage(buf);
  if (!mime || !AVATAR_TYPES[mime]) return { ok: false, reason: "PNG, JPEG or WebP only." };
  return { ok: true, mime, ext: AVATAR_TYPES[mime] };
}

export async function setAvatar(actor: Actor, targetId: string, buf: Buffer) {
  const target = await loadTarget(targetId);
  assertCanEdit(actor, target.id, target.role);
  const v = validateAvatar(buf);
  if (!v.ok) throw new AuthError(422, v.reason);
  const { newStorageKey, storage } = await import("../storage");
  const key = `avatars/${target.id}/${newStorageKey(v.ext).replace(/\//g, "-")}`;
  await storage().put(key, buf, v.mime);
  const [prev] = await db.select({ avatarKey: schema.users.avatarKey }).from(schema.users).where(eq(schema.users.id, target.id)).limit(1);
  const version = Date.now();
  await db.update(schema.users).set({ avatarKey: key, avatarMime: v.mime, image: `/api/avatar/${target.id}?v=${version}`, updatedAt: new Date(version) }).where(eq(schema.users.id, target.id));
  if (prev?.avatarKey) await storage().delete(prev.avatarKey).catch(() => undefined);
  await recordAudit({ actorId: actor.id, action: "profile.avatar", targetType: "user", targetId: target.id });
  return `/api/avatar/${target.id}?v=${version}`;
}

export async function removeAvatar(actor: Actor, targetId: string) {
  const target = await loadTarget(targetId);
  assertCanEdit(actor, target.id, target.role);
  const [prev] = await db.select({ avatarKey: schema.users.avatarKey }).from(schema.users).where(eq(schema.users.id, target.id)).limit(1);
  await db.update(schema.users).set({ avatarKey: null, avatarMime: null, image: null, updatedAt: new Date() }).where(eq(schema.users.id, target.id));
  if (prev?.avatarKey) { const { storage } = await import("../storage"); await storage().delete(prev.avatarKey).catch(() => undefined); }
}

/**
 * Who may see an avatar. Published staff avatars are public and cacheable.
 * Otherwise the viewer must be signed in: staff see everyone; clients see
 * staff and people in their own organisation. Nothing else is revealed.
 */
export async function avatarFor(viewer: Actor | null, targetId: string): Promise<{ key: string; mime: string; isPublic: boolean } | null> {
  const [t] = await db.select({ avatarKey: schema.users.avatarKey, avatarMime: schema.users.avatarMime, role: schema.users.role, organisationId: schema.users.organisationId, publicProfile: schema.users.publicProfile, disabled: schema.users.disabled }).from(schema.users).where(eq(schema.users.id, targetId)).limit(1);
  if (!t?.avatarKey || !t.avatarMime) return null;
  const targetStaff = STAFF_ROLES.includes(t.role);
  const isPublic = targetStaff && t.publicProfile && !t.disabled;
  if (isPublic) return { key: t.avatarKey, mime: t.avatarMime, isPublic: true };
  if (!viewer) return null;
  if (viewer.id === targetId || isStaff(viewer) || targetStaff) return { key: t.avatarKey, mime: t.avatarMime, isPublic: false };
  if (viewer.organisationId && viewer.organisationId === t.organisationId) return { key: t.avatarKey, mime: t.avatarMime, isPublic: false };
  return null;
}
