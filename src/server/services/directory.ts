import "server-only";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { canManageClients, canManageTeam, isAdmin, isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { auth } from "../auth/auth";
import { recordAudit } from "./activity";
import { uid } from "./ids";
import { STAFF_ROLES, type Role } from "../db/schema";
import { accessibleProjectIds } from "./access";

export function studioOrg() {
  return db.select().from(schema.organisations).where(eq(schema.organisations.kind, "studio")).get() ?? null;
}

export function listClients(actor: Actor) {
  if (!isStaff(actor)) throw new AuthError(403, "Staff only.");
  const orgs = db.select().from(schema.organisations).where(and(eq(schema.organisations.kind, "client"), isNull(schema.organisations.deletedAt))).orderBy(asc(schema.organisations.name)).all();
  return orgs.map((o) => ({
    ...o,
    projects: db.select({ n: sql<number>`count(*)` }).from(schema.projects).where(and(eq(schema.projects.organisationId, o.id), isNull(schema.projects.deletedAt))).get()?.n ?? 0,
    users: db.select({ n: sql<number>`count(*)` }).from(schema.users).where(eq(schema.users.organisationId, o.id)).get()?.n ?? 0,
  }));
}

export function getClient(actor: Actor, id: string) {
  if (!isStaff(actor) && actor.organisationId !== id) throw new AuthError(403, "Not allowed.");
  const org = db.select().from(schema.organisations).where(and(eq(schema.organisations.id, id), isNull(schema.organisations.deletedAt))).get();
  if (!org) return null;
  const users = db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, image: schema.users.image, title: schema.users.title, disabled: schema.users.disabled, emailVerified: schema.users.emailVerified, createdAt: schema.users.createdAt }).from(schema.users).where(eq(schema.users.organisationId, id)).orderBy(asc(schema.users.name)).all();
  const projects = db.select().from(schema.projects).where(and(eq(schema.projects.organisationId, id), isNull(schema.projects.deletedAt))).orderBy(desc(schema.projects.updatedAt)).all();
  return { ...org, users, projects };
}

export function createClient(actor: Actor, input: { name: string; website?: string; industry?: string; notes?: string; pixelTheme?: string | null }) {
  if (!canManageClients(actor)) throw new AuthError(403, "Only admins and project managers can add clients.");
  const id = uid();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) + "-" + id.slice(0, 4);
  db.insert(schema.organisations).values({ id, name: input.name, slug, kind: "client", website: input.website ?? null, industry: input.industry ?? null, notes: input.notes ?? null, pixelTheme: input.pixelTheme ?? null }).run();
  recordAudit({ actorId: actor.id, action: "client.create", targetType: "organisation", targetId: id, metadata: { name: input.name } });
  return id;
}

export function updateClient(actor: Actor, id: string, patch: { name?: string; website?: string | null; industry?: string | null; notes?: string | null; pixelTheme?: string | null }) {
  if (!canManageClients(actor)) throw new AuthError(403, "Only admins and project managers can edit clients.");
  db.update(schema.organisations).set({ ...patch, updatedAt: new Date() }).where(eq(schema.organisations.id, id)).run();
  recordAudit({ actorId: actor.id, action: "client.update", targetType: "organisation", targetId: id, metadata: patch });
}

export function listTeam(actor: Actor) {
  if (!isStaff(actor)) throw new AuthError(403, "Staff only.");
  const staff = db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, image: schema.users.image, title: schema.users.title, disabled: schema.users.disabled, createdAt: schema.users.createdAt })
    .from(schema.users).where(or(...STAFF_ROLES.map((r) => eq(schema.users.role, r)))).orderBy(asc(schema.users.name)).all();
  return staff.map((u) => ({
    ...u,
    openTasks: db.select({ n: sql<number>`count(*)` }).from(schema.tasks).where(and(eq(schema.tasks.assigneeId, u.id), sql`${schema.tasks.status} != 'done'`)).get()?.n ?? 0,
    openRequests: db.select({ n: sql<number>`count(*)` }).from(schema.requests).where(and(eq(schema.requests.assigneeId, u.id), sql`${schema.requests.status} not in ('completed','closed','rejected','cancelled')`)).get()?.n ?? 0,
    managing: db.select({ n: sql<number>`count(*)` }).from(schema.projects).where(and(eq(schema.projects.managerId, u.id), isNull(schema.projects.deletedAt), sql`${schema.projects.status} not in ('completed','on_hold')`)).get()?.n ?? 0,
  }));
}

/** Staff-side listing of people for assignment pickers: all staff plus the client users of a given organisation. */
export function assignableUsers(actor: Actor, organisationId?: string) {
  if (!isStaff(actor)) return [];
  const conds = organisationId ? or(or(...STAFF_ROLES.map((r) => eq(schema.users.role, r))), eq(schema.users.organisationId, organisationId)) : or(...STAFF_ROLES.map((r) => eq(schema.users.role, r)));
  return db.select({ id: schema.users.id, name: schema.users.name, role: schema.users.role, image: schema.users.image, organisationId: schema.users.organisationId }).from(schema.users).where(and(conds, eq(schema.users.disabled, false))).orderBy(asc(schema.users.name)).all();
}

/**
 * Invite or create a user with a role. Staff roles require an admin; client
 * roles require an admin/PM or a client admin of the same organisation.
 * The account is created through better-auth so password rules and
 * verification flows apply; a reset link is emailed so the person picks a password.
 */
export async function inviteUser(actor: Actor, input: { name: string; email: string; role: Role; organisationId: string | null; title?: string }, ip?: string | null) {
  const staffRole = STAFF_ROLES.includes(input.role);
  if (staffRole && !canManageTeam(actor)) throw new AuthError(403, "Only admins can add staff.");
  if (!staffRole) {
    const okStaff = isAdmin(actor) || actor.role === "project_manager";
    const okClientAdmin = actor.role === "client_admin" && actor.organisationId === input.organisationId;
    if (!okStaff && !okClientAdmin) throw new AuthError(403, "You cannot add users to this organisation.");
    if (!input.organisationId) throw new AuthError(403, "Client users need an organisation.");
  }
  if (input.role === "super_admin" && actor.role !== "super_admin") throw new AuthError(403, "Only a super admin can create super admins.");
  const existing = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email.toLowerCase())).get();
  if (existing) throw new AuthError(403, "A user with that email already exists.");
  const tempPassword = crypto.randomUUID() + "Aa1!";
  const created = await auth.api.signUpEmail({ body: { name: input.name, email: input.email.toLowerCase(), password: tempPassword } });
  const userId = created.user.id;
  db.update(schema.users).set({ role: input.role, organisationId: staffRole ? (studioOrg()?.id ?? null) : input.organisationId, title: input.title ?? null }).where(eq(schema.users.id, userId)).run();
  try { await auth.api.requestPasswordReset({ body: { email: input.email.toLowerCase(), redirectTo: "/reset-password" } }); } catch (err) { console.error("[invite] reset email failed", err); }
  recordAudit({ actorId: actor.id, action: "user.invite", targetType: "user", targetId: userId, metadata: { email: input.email, role: input.role, organisationId: input.organisationId }, ip });
  return userId;
}

export function updateUser(actor: Actor, id: string, patch: { role?: Role; disabled?: boolean; title?: string | null; organisationId?: string | null }, ip?: string | null) {
  const target = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!target) throw new AuthError(403, "User not found.");
  const targetIsStaff = STAFF_ROLES.includes(target.role);
  if (targetIsStaff || (patch.role && STAFF_ROLES.includes(patch.role))) { if (!canManageTeam(actor)) throw new AuthError(403, "Only admins can change staff."); }
  else if (!(isAdmin(actor) || actor.role === "project_manager" || (actor.role === "client_admin" && actor.organisationId === target.organisationId))) throw new AuthError(403, "Not allowed.");
  if ((patch.role === "super_admin" || target.role === "super_admin") && actor.role !== "super_admin") throw new AuthError(403, "Only a super admin can change super admins.");
  if (id === actor.id && patch.disabled) throw new AuthError(403, "You cannot disable yourself.");
  db.update(schema.users).set({ ...patch, updatedAt: new Date() }).where(eq(schema.users.id, id)).run();
  if (patch.disabled) db.delete(schema.sessions).where(eq(schema.sessions.userId, id)).run();
  recordAudit({ actorId: actor.id, action: "user.update", targetType: "user", targetId: id, metadata: patch, ip });
}

export function updateProfile(actor: Actor, patch: { name?: string; title?: string | null; timezone?: string | null }) {
  db.update(schema.users).set({ ...patch, updatedAt: new Date() }).where(eq(schema.users.id, actor.id)).run();
}

/** Global search over data the actor may see. */
export async function search(actor: Actor, q: string) {
  const term = `%${q.trim()}%`;
  if (q.trim().length < 2) return { projects: [], tasks: [], requests: [], files: [], clients: [], messages: [] };
  const ids = await accessibleProjectIds(actor);
  const within = ids.length ? ids : ["__none__"];
  const projects = db.select({ id: schema.projects.id, code: schema.projects.code, title: schema.projects.title, status: schema.projects.status }).from(schema.projects).where(and(sql`${schema.projects.id} in ${within}`, isNull(schema.projects.deletedAt), or(like(schema.projects.title, term), like(schema.projects.code, term)))).limit(6).all();
  const taskConds = [sql`${schema.tasks.projectId} in ${within}`, or(like(schema.tasks.title, term), like(schema.tasks.key, term))];
  if (!isStaff(actor)) taskConds.push(eq(schema.tasks.clientVisible, true));
  const tasks = db.select({ id: schema.tasks.id, key: schema.tasks.key, title: schema.tasks.title, status: schema.tasks.status }).from(schema.tasks).where(and(...taskConds)).limit(6).all();
  const requests = db.select({ id: schema.requests.id, number: schema.requests.number, title: schema.requests.title, status: schema.requests.status }).from(schema.requests).where(and(sql`${schema.requests.projectId} in ${within}`, or(like(schema.requests.title, term), sql`('PF-REQ-' || printf('%04d', ${schema.requests.number})) like ${term}`))).limit(6).all();
  const fileConds = [sql`${schema.files.projectId} in ${within}`, isNull(schema.files.deletedAt), like(schema.files.name, term)];
  if (!isStaff(actor)) fileConds.push(eq(schema.files.clientVisible, true));
  const files = db.select({ id: schema.files.id, name: schema.files.name, projectId: schema.files.projectId }).from(schema.files).where(and(...fileConds)).limit(6).all();
  const clients = isStaff(actor) ? db.select({ id: schema.organisations.id, name: schema.organisations.name }).from(schema.organisations).where(and(eq(schema.organisations.kind, "client"), like(schema.organisations.name, term))).limit(5).all() : [];
  const convConds = [sql`${schema.conversations.projectId} in ${within}`];
  if (!isStaff(actor)) convConds.push(eq(schema.conversations.internal, false));
  const messages = db.select({ id: schema.messages.id, body: schema.messages.body, conversationId: schema.messages.conversationId, requestId: schema.conversations.requestId, projectId: schema.conversations.projectId })
    .from(schema.messages).innerJoin(schema.conversations, eq(schema.conversations.id, schema.messages.conversationId)).where(and(...convConds, isNull(schema.messages.deletedAt), like(schema.messages.body, term))).limit(5).all();
  return { projects, tasks, requests, files, clients, messages };
}
