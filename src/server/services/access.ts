import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { AuthError } from "../auth/session";
import { canAccessProject, isStaff, type Actor } from "../auth/permissions";

/**
 * Tenant isolation lives here. Every service resolves a project through
 * `loadProjectFor`, which returns 404-equivalent (null) for anything the
 * actor may not see, so URL manipulation cannot enumerate other clients.
 */
export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const row = db.select({ userId: schema.projectMembers.userId }).from(schema.projectMembers)
    .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId))).get();
  return Boolean(row);
}

export async function loadProjectFor(actor: Actor, projectId: string) {
  const project = db.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt))).get();
  if (!project) return null;
  const member = await isProjectMember(project.id, actor.id);
  if (!canAccessProject(actor, project, member)) return null;
  return project;
}

export async function requireProject(actor: Actor, projectId: string) {
  const p = await loadProjectFor(actor, projectId);
  if (!p) throw new AuthError(403, "You do not have access to this project.");
  return p;
}

/** Ids of every project the actor can see. Used for lists, search and realtime scoping. */
export async function accessibleProjectIds(actor: Actor): Promise<string[]> {
  if (actor.disabled) return [];
  const cols = { id: schema.projects.id, organisationId: schema.projects.organisationId, managerId: schema.projects.managerId };
  if (actor.role === "super_admin" || actor.role === "admin" || actor.role === "project_manager") {
    return db.select(cols).from(schema.projects).where(isNull(schema.projects.deletedAt)).all().map((p) => p.id);
  }
  const memberships = new Set(db.select({ projectId: schema.projectMembers.projectId }).from(schema.projectMembers).where(eq(schema.projectMembers.userId, actor.id)).all().map((m) => m.projectId));
  if (actor.role === "team_member") {
    return db.select(cols).from(schema.projects).where(isNull(schema.projects.deletedAt)).all().filter((p) => memberships.has(p.id) || p.managerId === actor.id).map((p) => p.id);
  }
  if (!actor.organisationId) return [];
  const own = db.select(cols).from(schema.projects).where(and(isNull(schema.projects.deletedAt), eq(schema.projects.organisationId, actor.organisationId))).all();
  if (actor.role === "client_admin") return own.map((p) => p.id);
  return own.filter((p) => memberships.has(p.id)).map((p) => p.id);
}

/** Staff on a project: manager plus explicit staff members, used for notification fan-out. */
export function projectStaffIds(projectId: string, managerId: string | null): string[] {
  const members = db.select({ userId: schema.projectMembers.userId, role: schema.projectMembers.role }).from(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId)).all();
  const ids = new Set(members.filter((m) => m.role !== "client").map((m) => m.userId));
  if (managerId) ids.add(managerId);
  return [...ids];
}

/** Client users who should hear about client-visible project events. */
export function projectClientIds(projectId: string, organisationId: string): string[] {
  const members = db.select({ userId: schema.projectMembers.userId }).from(schema.projectMembers).where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.role, "client"))).all().map((m) => m.userId);
  const admins = db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.organisationId, organisationId), eq(schema.users.role, "client_admin"), eq(schema.users.disabled, false))).all().map((u) => u.id);
  return [...new Set([...members, ...admins])];
}

export function usersByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, image: schema.users.image, role: schema.users.role, title: schema.users.title }).from(schema.users).where(inArray(schema.users.id, ids)).all();
}

export const visibleFilter = (actor: Actor) => (isStaff(actor) ? undefined : true);
