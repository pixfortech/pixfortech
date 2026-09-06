import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { recordActivity } from "./activity";
import { notify } from "./notifications";
import { nextNumber, uid } from "./ids";
import { publish } from "../realtime/bus";
import { TASK_STATUSES } from "../db/schema";

export const TASK_STATUS_LABELS: Record<string, string> = { backlog: "Backlog", todo: "To do", in_progress: "In progress", in_review: "In review", blocked: "Blocked", done: "Done" };

const taskSelect = {
  id: schema.tasks.id, key: schema.tasks.key, title: schema.tasks.title, description: schema.tasks.description, status: schema.tasks.status, priority: schema.tasks.priority,
  dueDate: schema.tasks.dueDate, labels: schema.tasks.labels, checklist: schema.tasks.checklist, clientVisible: schema.tasks.clientVisible, order: schema.tasks.order,
  projectId: schema.tasks.projectId, milestoneId: schema.tasks.milestoneId, requestId: schema.tasks.requestId, assigneeId: schema.tasks.assigneeId, completedAt: schema.tasks.completedAt,
  createdAt: schema.tasks.createdAt, updatedAt: schema.tasks.updatedAt, assigneeName: schema.users.name, assigneeImage: schema.users.image, projectCode: schema.projects.code, projectTitle: schema.projects.title,
};

export async function listTasks(actor: Actor, filter: { projectId?: string; assigneeId?: string; status?: string; priority?: string; due?: "today" | "overdue" | "week"; requestId?: string; milestoneId?: string } = {}) {
  const ids = filter.projectId ? [(await requireProject(actor, filter.projectId)).id] : await accessibleProjectIds(actor);
  if (!ids.length) return [];
  const conds = [inArray(schema.tasks.projectId, ids)];
  if (!isStaff(actor)) conds.push(eq(schema.tasks.clientVisible, true));
  if (filter.assigneeId) conds.push(eq(schema.tasks.assigneeId, filter.assigneeId));
  if (filter.status) conds.push(eq(schema.tasks.status, filter.status as (typeof TASK_STATUSES)[number]));
  if (filter.priority) conds.push(eq(schema.tasks.priority, filter.priority as (typeof schema.PRIORITIES)[number]));
  if (filter.requestId) conds.push(eq(schema.tasks.requestId, filter.requestId));
  if (filter.milestoneId) conds.push(eq(schema.tasks.milestoneId, filter.milestoneId));
  const now = new Date();
  if (filter.due === "overdue") conds.push(and(lt(schema.tasks.dueDate, now), sql`${schema.tasks.status} != 'done'`)!);
  if (filter.due === "today") { const end = new Date(now); end.setHours(23, 59, 59, 999); conds.push(sql`${schema.tasks.dueDate} between ${now.getTime() - 86400000 * 0} and ${end.getTime()}`); }
  if (filter.due === "week") { conds.push(sql`${schema.tasks.dueDate} between ${now.getTime()} and ${now.getTime() + 7 * 86400000}`); }
  return db.select(taskSelect).from(schema.tasks)
    .leftJoin(schema.users, eq(schema.users.id, schema.tasks.assigneeId))
    .innerJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
    .where(and(...conds)).orderBy(asc(schema.tasks.order), desc(schema.tasks.updatedAt)).all();
}

export async function getTask(actor: Actor, id: string) {
  const t = db.select(taskSelect).from(schema.tasks).leftJoin(schema.users, eq(schema.users.id, schema.tasks.assigneeId)).innerJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId)).where(eq(schema.tasks.id, id)).get();
  if (!t) return null;
  const project = await requireProject(actor, t.projectId);
  if (!isStaff(actor) && !t.clientVisible) return null;
  const comments = db.select({ id: schema.taskComments.id, body: schema.taskComments.body, internal: schema.taskComments.internal, createdAt: schema.taskComments.createdAt, authorName: schema.users.name, authorImage: schema.users.image })
    .from(schema.taskComments).innerJoin(schema.users, eq(schema.users.id, schema.taskComments.authorId))
    .where(isStaff(actor) ? eq(schema.taskComments.taskId, id) : and(eq(schema.taskComments.taskId, id), eq(schema.taskComments.internal, false))).orderBy(asc(schema.taskComments.createdAt)).all();
  const collaborators = usersByIds(db.select({ userId: schema.taskCollaborators.userId }).from(schema.taskCollaborators).where(eq(schema.taskCollaborators.taskId, id)).all().map((c) => c.userId));
  const files = db.select().from(schema.files).where(and(eq(schema.files.taskId, id), isNull(schema.files.deletedAt))).all();
  return { ...t, project, comments, collaborators, files };
}

export type TaskInput = { title: string; description?: string; status?: (typeof TASK_STATUSES)[number]; priority?: (typeof schema.PRIORITIES)[number]; assigneeId?: string | null; dueDate?: Date | null; labels?: string[]; milestoneId?: string | null; requestId?: string | null; clientVisible?: boolean; checklist?: { text: string; done: boolean }[] };

export async function createTask(actor: Actor, projectId: string, input: TaskInput) {
  if (!isStaff(actor)) throw new AuthError(403, "Only staff can create tasks.");
  const project = await requireProject(actor, projectId);
  const id = uid();
  const n = nextNumber(`task:${project.code}`);
  const key = `${project.code}-${n}`;
  db.insert(schema.tasks).values({
    id, projectId, key, title: input.title, description: input.description ?? null, status: input.status ?? "todo", priority: input.priority ?? "medium",
    assigneeId: input.assigneeId ?? null, dueDate: input.dueDate ?? null, labels: input.labels ? JSON.stringify(input.labels) : null, milestoneId: input.milestoneId ?? null,
    requestId: input.requestId ?? null, clientVisible: input.clientVisible ?? false, checklist: input.checklist ? JSON.stringify(input.checklist) : null, createdById: actor.id, order: Date.now() % 1_000_000,
  }).run();
  recordActivity({ organisationId: project.organisationId, projectId, actorId: actor.id, kind: "task.created", summary: `created task ${key} “${input.title}”`, targetType: "task", targetId: id, href: `/tasks/${id}`, internal: !(input.clientVisible ?? false) });
  if (input.assigneeId) await notify({ recipientIds: [input.assigneeId], category: "task", title: `You were assigned ${key}`, body: input.title, href: `/tasks/${id}`, projectId, actorId: actor.id });
  publish({ type: "task.created", audience: { projectIds: [projectId] }, payload: { id, projectId } });
  return { id, key };
}

export async function updateTask(actor: Actor, id: string, patch: Partial<TaskInput>) {
  if (!isStaff(actor)) throw new AuthError(403, "Only staff can edit tasks.");
  const t = db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
  if (!t) throw new AuthError(403, "Task not found.");
  const project = await requireProject(actor, t.projectId);
  const set: Partial<typeof schema.tasks.$inferInsert> = { updatedAt: new Date() };
  for (const k of ["title", "description", "status", "priority", "assigneeId", "dueDate", "milestoneId", "requestId", "clientVisible"] as const) {
    if (patch[k] !== undefined) (set as Record<string, unknown>)[k] = patch[k];
  }
  if (patch.labels !== undefined) set.labels = JSON.stringify(patch.labels);
  if (patch.checklist !== undefined) set.checklist = JSON.stringify(patch.checklist);
  if (patch.status === "done" && t.status !== "done") set.completedAt = new Date();
  if (patch.status && patch.status !== "done") set.completedAt = null;
  db.update(schema.tasks).set(set).where(eq(schema.tasks.id, id)).run();
  if (patch.status && patch.status !== t.status) {
    recordActivity({ organisationId: project.organisationId, projectId: t.projectId, actorId: actor.id, kind: "task.status", summary: `moved ${t.key} to ${TASK_STATUS_LABELS[patch.status]}`, targetType: "task", targetId: id, href: `/tasks/${id}`, internal: !t.clientVisible });
    if (patch.status === "done") await notify({ recipientIds: projectStaffIds(t.projectId, project.managerId), category: "task", title: `${t.key} completed`, body: t.title, href: `/tasks/${id}`, projectId: t.projectId, actorId: actor.id });
  }
  if (patch.assigneeId && patch.assigneeId !== t.assigneeId) await notify({ recipientIds: [patch.assigneeId], category: "task", title: `You were assigned ${t.key}`, body: t.title, href: `/tasks/${id}`, projectId: t.projectId, actorId: actor.id });
  publish({ type: "task.updated", audience: { projectIds: [t.projectId] }, payload: { id, projectId: t.projectId, status: patch.status ?? t.status } });
}

export async function addTaskComment(actor: Actor, taskId: string, body: string, internal: boolean) {
  const t = db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).get();
  if (!t) throw new AuthError(403, "Task not found.");
  const project = await requireProject(actor, t.projectId);
  if (!isStaff(actor) && (!t.clientVisible || internal)) throw new AuthError(403, "Not allowed.");
  const id = uid();
  db.insert(schema.taskComments).values({ id, taskId, authorId: actor.id, body, internal: isStaff(actor) ? internal : false }).run();
  recordActivity({ organisationId: project.organisationId, projectId: t.projectId, actorId: actor.id, kind: "task.comment", summary: `commented on ${t.key}`, targetType: "task", targetId: taskId, href: `/tasks/${taskId}`, internal });
  const recipients = new Set(projectStaffIds(t.projectId, project.managerId));
  if (t.assigneeId) recipients.add(t.assigneeId);
  await notify({ recipientIds: [...recipients], category: "task", title: `New comment on ${t.key}`, body: body.slice(0, 120), href: `/tasks/${taskId}`, projectId: t.projectId, actorId: actor.id });
  publish({ type: "task.updated", audience: { projectIds: [t.projectId] }, payload: { id: taskId, projectId: t.projectId } });
  return id;
}

export async function taskStats(actor: Actor) {
  const all = await listTasks(actor);
  const now = Date.now();
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const open = all.filter((t) => t.status !== "done");
  return {
    dueToday: open.filter((t) => t.dueDate && t.dueDate.getTime() <= end.getTime() && t.dueDate.getTime() >= now - 86400000).length,
    overdue: open.filter((t) => t.dueDate && t.dueDate.getTime() < now).length,
    upcoming: open.filter((t) => t.dueDate && t.dueDate.getTime() > end.getTime() && t.dueDate.getTime() < now + 7 * 86400000).length,
    blocked: open.filter((t) => t.status === "blocked").length,
    open: open.length,
  };
}
