import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { canManageProjects, isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectClientIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { recordActivity, recordAudit } from "./activity";
import { notify } from "./notifications";
import { nextNumber, projectCode, uid } from "./ids";
import { PROJECT_STATUSES, type ProjectStatus } from "../db/schema";

export const STATUS_LABELS: Record<string, string> = {
  lead: "Lead", discovery: "Discovery", planning: "Planning", design: "Design", development: "Development", internal_qa: "Internal QA",
  client_review: "Client review", changes_requested: "Changes requested", final_qa: "Final QA", deployment: "Deployment", maintenance: "Maintenance",
  completed: "Completed", on_hold: "On hold",
};

export function projectWorkflow(project: { workflow: string | null }): string[] {
  if (project.workflow) { try { const w = JSON.parse(project.workflow); if (Array.isArray(w) && w.length) return w; } catch { /* fall through */ } }
  return [...PROJECT_STATUSES];
}

export async function listProjects(actor: Actor, filter: { status?: string; organisationId?: string; managerId?: string; q?: string } = {}) {
  const ids = await accessibleProjectIds(actor);
  if (!ids.length) return [];
  const conds = [inArray(schema.projects.id, ids), isNull(schema.projects.deletedAt)];
  if (filter.status) conds.push(eq(schema.projects.status, filter.status));
  if (filter.organisationId) conds.push(eq(schema.projects.organisationId, filter.organisationId));
  if (filter.managerId) conds.push(eq(schema.projects.managerId, filter.managerId));
  if (filter.q) conds.push(sql`(${schema.projects.title} like ${"%" + filter.q + "%"} or ${schema.projects.code} like ${"%" + filter.q + "%"})`);
  return db.select({
    id: schema.projects.id, code: schema.projects.code, title: schema.projects.title, summary: schema.projects.summary, status: schema.projects.status,
    priority: schema.projects.priority, health: schema.projects.health, progress: schema.projects.progress, phase: schema.projects.phase,
    startDate: schema.projects.startDate, targetDate: schema.projects.targetDate, updatedAt: schema.projects.updatedAt, pixelTheme: schema.projects.pixelTheme,
    organisationId: schema.projects.organisationId, organisationName: schema.organisations.name, managerId: schema.projects.managerId, managerName: schema.users.name,
  }).from(schema.projects)
    .innerJoin(schema.organisations, eq(schema.organisations.id, schema.projects.organisationId))
    .leftJoin(schema.users, eq(schema.users.id, schema.projects.managerId))
    .where(and(...conds)).orderBy(desc(schema.projects.updatedAt)).all();
}

export async function getProject(actor: Actor, id: string) {
  const project = await requireProject(actor, id);
  const org = db.select().from(schema.organisations).where(eq(schema.organisations.id, project.organisationId)).get()!;
  const manager = project.managerId ? usersByIds([project.managerId])[0] ?? null : null;
  const memberRows = db.select({ userId: schema.projectMembers.userId, role: schema.projectMembers.role }).from(schema.projectMembers).where(eq(schema.projectMembers.projectId, id)).all();
  const members = usersByIds(memberRows.map((m) => m.userId)).map((u) => ({ ...u, projectRole: memberRows.find((m) => m.userId === u.id)?.role ?? "member" }));
  return { ...project, organisation: org, manager, members, workflow: projectWorkflow(project) };
}

export type ProjectInput = {
  organisationId: string; title: string; summary?: string; status?: string; priority?: (typeof schema.PRIORITIES)[number]; managerId?: string | null;
  startDate?: Date | null; targetDate?: Date | null; phase?: string | null; pixelTheme?: string | null;
};

export async function createProject(actor: Actor, input: ProjectInput) {
  if (!canManageProjects(actor)) throw new AuthError(403, "Only admins and project managers can create projects.");
  const id = uid();
  const code = projectCode(nextNumber("project"));
  db.insert(schema.projects).values({
    id, code, organisationId: input.organisationId, title: input.title, summary: input.summary ?? null, status: input.status ?? "planning",
    priority: input.priority ?? "medium", managerId: input.managerId ?? actor.id, startDate: input.startDate ?? null, targetDate: input.targetDate ?? null,
    phase: input.phase ?? null, pixelTheme: input.pixelTheme ?? null, createdById: actor.id,
  }).run();
  // Project channel conversation
  db.insert(schema.conversations).values({ id: uid(), organisationId: input.organisationId, projectId: id, title: "Project chat", internal: false }).run();
  db.insert(schema.conversations).values({ id: uid(), organisationId: input.organisationId, projectId: id, title: "Internal", internal: true }).run();
  recordActivity({ organisationId: input.organisationId, projectId: id, actorId: actor.id, kind: "project.created", summary: `created project ${code} “${input.title}”`, targetType: "project", targetId: id, href: `/projects/${id}` });
  recordAudit({ actorId: actor.id, action: "project.create", targetType: "project", targetId: id, metadata: { code, organisationId: input.organisationId } });
  return { id, code };
}

export async function updateProject(actor: Actor, id: string, patch: Partial<ProjectInput> & { health?: (typeof schema.HEALTH)[number]; progress?: number; workflow?: string[] | null }) {
  if (!canManageProjects(actor)) throw new AuthError(403, "Only admins and project managers can edit projects.");
  const project = await requireProject(actor, id);
  const set: Partial<typeof schema.projects.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.summary !== undefined) set.summary = patch.summary ?? null;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.health !== undefined) set.health = patch.health;
  if (patch.progress !== undefined) set.progress = Math.max(0, Math.min(100, patch.progress));
  if (patch.managerId !== undefined) set.managerId = patch.managerId;
  if (patch.startDate !== undefined) set.startDate = patch.startDate;
  if (patch.targetDate !== undefined) set.targetDate = patch.targetDate;
  if (patch.phase !== undefined) set.phase = patch.phase;
  if (patch.pixelTheme !== undefined) set.pixelTheme = patch.pixelTheme;
  if (patch.workflow !== undefined) set.workflow = patch.workflow ? JSON.stringify(patch.workflow) : null;
  const statusChanged = patch.status !== undefined && patch.status !== project.status;
  if (statusChanged) set.status = patch.status as ProjectStatus;
  db.update(schema.projects).set(set).where(eq(schema.projects.id, id)).run();
  if (statusChanged) {
    const label = STATUS_LABELS[patch.status!] ?? patch.status!;
    recordActivity({ organisationId: project.organisationId, projectId: id, actorId: actor.id, kind: "project.status", summary: `moved ${project.code} to ${label}`, targetType: "project", targetId: id, href: `/projects/${id}` });
    await notify({ recipientIds: [...projectClientIds(id, project.organisationId), ...projectStaffIds(id, project.managerId)], category: "project", title: `${project.code} is now ${label}`, body: project.title, href: `/projects/${id}`, projectId: id, actorId: actor.id });
  } else {
    recordActivity({ organisationId: project.organisationId, projectId: id, actorId: actor.id, kind: "project.updated", summary: `updated ${project.code}`, targetType: "project", targetId: id, href: `/projects/${id}`, internal: true });
  }
  recordAudit({ actorId: actor.id, action: "project.update", targetType: "project", targetId: id, metadata: patch as Record<string, unknown> });
}

export async function setProjectMembers(actor: Actor, projectId: string, members: { userId: string; role: "manager" | "member" | "client" }[]) {
  if (!canManageProjects(actor)) throw new AuthError(403, "Only admins and project managers can change the team.");
  await requireProject(actor, projectId);
  db.delete(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId)).run();
  if (members.length) db.insert(schema.projectMembers).values(members.map((m) => ({ projectId, userId: m.userId, role: m.role }))).run();
  recordAudit({ actorId: actor.id, action: "project.members", targetType: "project", targetId: projectId, metadata: { members } });
}

/** Aggregate counts for the admin overview. */
export async function projectStats(actor: Actor) {
  const rows = await listProjects(actor);
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  const active = rows.filter((r) => !["completed", "on_hold", "lead"].includes(r.status)).length;
  return {
    total: rows.length, active, planning: by("planning") + by("discovery"), awaitingClient: by("client_review"),
    delayed: rows.filter((r) => r.health === "delayed").length, completed: by("completed"), onHold: by("on_hold"), atRisk: rows.filter((r) => r.health === "at_risk").length,
  };
}

// ---------------------------------------------------------------- milestones
export async function listMilestones(actor: Actor, projectId: string) {
  await requireProject(actor, projectId);
  const conds = [eq(schema.milestones.projectId, projectId)];
  if (!isStaff(actor)) conds.push(eq(schema.milestones.clientVisible, true));
  const rows = db.select().from(schema.milestones).where(and(...conds)).orderBy(asc(schema.milestones.order), asc(schema.milestones.dueDate)).all();
  const owners = usersByIds(rows.map((r) => r.ownerId).filter((x): x is string => Boolean(x)));
  return rows.map((m) => ({ ...m, owner: owners.find((o) => o.id === m.ownerId) ?? null }));
}

export type MilestoneInput = { title: string; description?: string; status?: (typeof schema.MILESTONE_STATUSES)[number]; progress?: number; ownerId?: string | null; startDate?: Date | null; dueDate?: Date | null; clientVisible?: boolean; requiresApproval?: boolean; dependsOnId?: string | null };

export async function createMilestone(actor: Actor, projectId: string, input: MilestoneInput) {
  if (!canManageProjects(actor)) throw new AuthError(403, "Only admins and project managers can add milestones.");
  const project = await requireProject(actor, projectId);
  const id = uid();
  const count = db.select({ n: sql<number>`count(*)` }).from(schema.milestones).where(eq(schema.milestones.projectId, projectId)).get()?.n ?? 0;
  db.insert(schema.milestones).values({ id, projectId, title: input.title, description: input.description ?? null, status: input.status ?? "planned", progress: input.progress ?? 0, ownerId: input.ownerId ?? null, startDate: input.startDate ?? null, dueDate: input.dueDate ?? null, order: count, clientVisible: input.clientVisible ?? true, requiresApproval: input.requiresApproval ?? false, dependsOnId: input.dependsOnId ?? null }).run();
  recordActivity({ organisationId: project.organisationId, projectId, actorId: actor.id, kind: "milestone.created", summary: `added milestone “${input.title}”`, targetType: "milestone", targetId: id, href: `/projects/${projectId}/timeline`, internal: !(input.clientVisible ?? true) });
  return id;
}

export async function updateMilestone(actor: Actor, id: string, patch: Partial<MilestoneInput>) {
  if (!canManageProjects(actor)) throw new AuthError(403, "Only admins and project managers can edit milestones.");
  const m = db.select().from(schema.milestones).where(eq(schema.milestones.id, id)).get();
  if (!m) throw new AuthError(403, "Milestone not found.");
  const project = await requireProject(actor, m.projectId);
  const set: Partial<typeof schema.milestones.$inferInsert> = { updatedAt: new Date() };
  for (const k of ["title", "description", "status", "progress", "ownerId", "startDate", "dueDate", "clientVisible", "requiresApproval", "dependsOnId"] as const) {
    if (patch[k] !== undefined) (set as Record<string, unknown>)[k] = patch[k];
  }
  if (patch.status === "completed") set.progress = 100;
  db.update(schema.milestones).set(set).where(eq(schema.milestones.id, id)).run();
  if (patch.status && patch.status !== m.status) {
    const label = patch.status.replace("_", " ");
    recordActivity({ organisationId: project.organisationId, projectId: m.projectId, actorId: actor.id, kind: "milestone.status", summary: `marked milestone “${m.title}” as ${label}`, targetType: "milestone", targetId: id, href: `/projects/${m.projectId}/timeline`, internal: !m.clientVisible });
    if (m.clientVisible && (patch.status === "completed" || patch.status === "awaiting_approval")) {
      await notify({ recipientIds: projectClientIds(m.projectId, project.organisationId), category: "milestone", title: patch.status === "completed" ? `Milestone completed: ${m.title}` : `Milestone awaiting your approval: ${m.title}`, body: project.title, href: `/projects/${m.projectId}/timeline`, projectId: m.projectId, actorId: actor.id });
    }
  }
}
