import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { allowedRequestTransitions, isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectClientIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { recordActivity } from "./activity";
import { notify } from "./notifications";
import { nextNumber, requestCode, uid } from "./ids";
import { publish } from "../realtime/bus";
import type { RequestStatus } from "../db/schema";

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted", acknowledged: "Acknowledged", under_review: "Under review", needs_clarification: "Needs clarification", estimated: "Estimated",
  approved: "Approved", scheduled: "Scheduled", in_progress: "In progress", ready_for_review: "Ready for review", changes_requested: "Changes requested",
  completed: "Completed", closed: "Closed", rejected: "Rejected", cancelled: "Cancelled", on_hold: "On hold", blocked: "Blocked",
};
export const REQUEST_TYPE_LABELS: Record<string, string> = { edit: "Edit", bug: "Bug", feature: "New feature", design: "Design change", content: "Content change", integration: "Integration", performance: "Performance", other: "Other" };
export const CLOSED_STATUSES = ["completed", "closed", "rejected", "cancelled"];

const select = {
  id: schema.requests.id, number: schema.requests.number, title: schema.requests.title, type: schema.requests.type, status: schema.requests.status, priority: schema.requests.priority,
  area: schema.requests.area, projectId: schema.requests.projectId, requesterId: schema.requests.requesterId, assigneeId: schema.requests.assigneeId, estimate: schema.requests.estimate,
  estimatedCompletion: schema.requests.estimatedCompletion, desiredDate: schema.requests.desiredDate, createdAt: schema.requests.createdAt, updatedAt: schema.requests.updatedAt,
  projectCode: schema.projects.code, projectTitle: schema.projects.title, organisationId: schema.requests.organisationId,
};

export async function listRequests(actor: Actor, filter: { projectId?: string; status?: string; type?: string; priority?: string; assigneeId?: string; organisationId?: string; open?: boolean } = {}) {
  const ids = filter.projectId ? [(await requireProject(actor, filter.projectId)).id] : await accessibleProjectIds(actor);
  if (!ids.length) return [];
  const conds = [inArray(schema.requests.projectId, ids)];
  if (filter.status) conds.push(eq(schema.requests.status, filter.status as RequestStatus));
  if (filter.type) conds.push(eq(schema.requests.type, filter.type as (typeof schema.REQUEST_TYPES)[number]));
  if (filter.priority) conds.push(eq(schema.requests.priority, filter.priority as (typeof schema.PRIORITIES)[number]));
  if (filter.assigneeId) conds.push(eq(schema.requests.assigneeId, filter.assigneeId));
  if (filter.organisationId) conds.push(eq(schema.requests.organisationId, filter.organisationId));
  const rows = (await db.select(select).from(schema.requests).innerJoin(schema.projects, eq(schema.projects.id, schema.requests.projectId)).where(and(...conds)).orderBy(desc(schema.requests.updatedAt)));
  const people = (await usersByIds([...new Set(rows.flatMap((r) => [r.requesterId, r.assigneeId].filter((x): x is string => Boolean(x))))]));
  const withPeople = rows.map((r) => ({ ...r, ref: requestCode(r.number), requester: people.find((p) => p.id === r.requesterId) ?? null, assignee: people.find((p) => p.id === r.assigneeId) ?? null }));
  return filter.open ? withPeople.filter((r) => !CLOSED_STATUSES.includes(r.status)) : withPeople;
}

export async function getRequest(actor: Actor, id: string) {
  const full = (await db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1))[0];
  if (!full) return null;
  const project = await requireProject(actor, full.projectId).catch(() => null);
  if (!project) return null;
  const staff = isStaff(actor);
  // Internal notes are filtered in the query, never in the UI.
  const comments = (await db.select({ id: schema.requestComments.id, body: schema.requestComments.body, internal: schema.requestComments.internal, createdAt: schema.requestComments.createdAt, authorId: schema.requestComments.authorId, authorName: schema.users.name, authorImage: schema.users.image, authorRole: schema.users.role })
    .from(schema.requestComments).innerJoin(schema.users, eq(schema.users.id, schema.requestComments.authorId))
    .where(staff ? eq(schema.requestComments.requestId, id) : and(eq(schema.requestComments.requestId, id), eq(schema.requestComments.internal, false)))
    .orderBy(asc(schema.requestComments.createdAt)));
  const fileConds = [eq(schema.files.requestId, id), isNull(schema.files.deletedAt)];
  if (!staff) fileConds.push(eq(schema.files.clientVisible, true));
  const files = (await db.select().from(schema.files).where(and(...fileConds)));
  const taskConds = [eq(schema.tasks.requestId, id)];
  if (!staff) taskConds.push(eq(schema.tasks.clientVisible, true));
  const tasks = (await db.select({ id: schema.tasks.id, key: schema.tasks.key, title: schema.tasks.title, status: schema.tasks.status, assigneeId: schema.tasks.assigneeId }).from(schema.tasks).where(and(...taskConds)));
  const histConds = [eq(schema.activityEvents.targetType, "request"), eq(schema.activityEvents.targetId, id)];
  if (!staff) histConds.push(eq(schema.activityEvents.internal, false));
  const history = (await db.select({ id: schema.activityEvents.id, kind: schema.activityEvents.kind, summary: schema.activityEvents.summary, createdAt: schema.activityEvents.createdAt, internal: schema.activityEvents.internal, actorName: schema.users.name })
    .from(schema.activityEvents).leftJoin(schema.users, eq(schema.users.id, schema.activityEvents.actorId)).where(and(...histConds)).orderBy(asc(schema.activityEvents.createdAt)));
  const approvals = (await db.select().from(schema.approvals).where(eq(schema.approvals.requestId, id)));
  const people = (await usersByIds([full.requesterId, full.assigneeId].filter((x): x is string => Boolean(x))));
  const thread = (await db.select({ id: schema.conversations.id }).from(schema.conversations).where(eq(schema.conversations.requestId, id)).limit(1))[0];
  return {
    ...full, ref: requestCode(full.number), project, requester: people.find((p) => p.id === full.requesterId) ?? null, assignee: people.find((p) => p.id === full.assigneeId) ?? null,
    comments, files, tasks, history, approvals, conversationId: thread?.id ?? null, transitions: allowedRequestTransitions(actor, full.status),
  };
}

export type RequestInput = { projectId: string; title: string; type: (typeof schema.REQUEST_TYPES)[number]; description: string; area?: string; priority?: (typeof schema.PRIORITIES)[number]; reason?: string; desiredDate?: Date | null };

export async function createRequest(actor: Actor, input: RequestInput) {
  const project = await requireProject(actor, input.projectId);
  const id = uid();
  const number = (await nextNumber("request"));
  const ref = requestCode(number);
  (await db.insert(schema.requests).values({
    id, organisationId: project.organisationId, projectId: project.id, number, title: input.title, type: input.type, description: input.description, area: input.area ?? null,
    priority: input.priority ?? "medium", reason: input.reason ?? null, desiredDate: input.desiredDate ?? null, requesterId: actor.id, assigneeId: project.managerId ?? null,
  }));
  (await db.insert(schema.conversations).values({ id: uid(), organisationId: project.organisationId, projectId: project.id, requestId: id, title: `${ref} · ${input.title}`, internal: false }));
  (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "request.created", summary: `submitted ${ref} “${input.title}”`, targetType: "request", targetId: id, href: `/requests/${id}` }));
  await notify({ recipientIds: (await projectStaffIds(project.id, project.managerId)), category: "request", title: `New change request · ${ref}`, body: `${project.title}: “${input.title}”`, href: `/requests/${id}`, projectId: project.id, actorId: actor.id });
  (await publish({ type: "request.created", audience: { projectIds: [project.id], staff: true }, payload: { id, ref, projectId: project.id } }));
  return { id, ref };
}

export async function transitionRequest(actor: Actor, id: string, status: RequestStatus, note?: string) {
  const r = (await db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1))[0];
  if (!r) throw new AuthError(403, "Request not found.");
  const project = await requireProject(actor, r.projectId);
  const allowed = allowedRequestTransitions(actor, r.status);
  if (!allowed.includes(status)) throw new AuthError(403, `Cannot move a request from ${REQUEST_STATUS_LABELS[r.status]} to ${REQUEST_STATUS_LABELS[status] ?? status}.`);
  const closed = CLOSED_STATUSES.includes(status);
  (await db.update(schema.requests).set({ status, updatedAt: new Date(), closedAt: closed ? new Date() : null }).where(eq(schema.requests.id, id)));
  const ref = requestCode(r.number);
  (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "request.status", summary: `moved ${ref} to ${REQUEST_STATUS_LABELS[status]}${note ? ` · ${note}` : ""}`, targetType: "request", targetId: id, href: `/requests/${id}` }));
  const recipients = isStaff(actor) ? [...(await projectClientIds(project.id, project.organisationId)), r.requesterId] : (await projectStaffIds(project.id, project.managerId));
  await notify({ recipientIds: recipients, category: "request", title: `${ref} is now ${REQUEST_STATUS_LABELS[status]}`, body: r.title, href: `/requests/${id}`, projectId: project.id, actorId: actor.id });
  (await publish({ type: "request.updated", audience: { projectIds: [project.id], staff: true }, payload: { id, ref, status, projectId: project.id } }));
}

export async function assignRequest(actor: Actor, id: string, assigneeId: string | null, estimate?: string | null, estimatedCompletion?: Date | null) {
  if (!isStaff(actor)) throw new AuthError(403, "Only staff can assign requests.");
  const r = (await db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1))[0];
  if (!r) throw new AuthError(403, "Request not found.");
  const project = await requireProject(actor, r.projectId);
  (await db.update(schema.requests).set({ assigneeId, estimate: estimate === undefined ? r.estimate : estimate, estimatedCompletion: estimatedCompletion === undefined ? r.estimatedCompletion : estimatedCompletion, updatedAt: new Date() }).where(eq(schema.requests.id, id)));
  const ref = requestCode(r.number);
  if (assigneeId && assigneeId !== r.assigneeId) {
    (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "request.assigned", summary: `assigned ${ref}`, targetType: "request", targetId: id, href: `/requests/${id}`, internal: true }));
    await notify({ recipientIds: [assigneeId], category: "request", title: `${ref} assigned to you`, body: r.title, href: `/requests/${id}`, projectId: project.id, actorId: actor.id });
  }
  if (estimate !== undefined || estimatedCompletion !== undefined) {
    (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "request.estimated", summary: `updated the estimate for ${ref}`, targetType: "request", targetId: id, href: `/requests/${id}` }));
  }
  (await publish({ type: "request.updated", audience: { projectIds: [project.id], staff: true }, payload: { id, ref, projectId: project.id } }));
}

async function actorNameFor(id: string): Promise<string> {
  return (await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, id)).limit(1))[0]?.name ?? "Someone";
}

export async function addRequestComment(actor: Actor, id: string, body: string, internal: boolean) {
  const r = (await db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1))[0];
  if (!r) throw new AuthError(403, "Request not found.");
  const project = await requireProject(actor, r.projectId);
  // Clients can never write internal notes; the flag is forced off server-side.
  const isInternal = isStaff(actor) ? internal : false;
  const cid = uid();
  (await db.insert(schema.requestComments).values({ id: cid, requestId: id, authorId: actor.id, body, internal: isInternal }));
  (await db.update(schema.requests).set({ updatedAt: new Date() }).where(eq(schema.requests.id, id)));
  const ref = requestCode(r.number);
  (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "request.comment", summary: isInternal ? `added an internal note to ${ref}` : `commented on ${ref}`, targetType: "request", targetId: id, href: `/requests/${id}`, internal: isInternal }));
  const recipients = isInternal ? (await projectStaffIds(project.id, project.managerId)) : [...(await projectStaffIds(project.id, project.managerId)), ...(await projectClientIds(project.id, project.organisationId)), r.requesterId];
  await notify({ recipientIds: recipients, category: "request", title: `${(await actorNameFor(actor.id))} commented on ${ref}`, body: body.slice(0, 140), href: `/requests/${id}`, projectId: project.id, actorId: actor.id });
  (await publish({ type: "request.updated", audience: isInternal ? { staff: true } : { projectIds: [project.id], staff: true }, payload: { id, ref, projectId: project.id, comment: true } }));
  return cid;
}

export async function requestStats(actor: Actor) {
  const rows = await listRequests(actor);
  const by = (...s: string[]) => rows.filter((r) => s.includes(r.status)).length;
  return { new: by("submitted"), reviewing: by("acknowledged", "under_review", "needs_clarification", "estimated"), approved: by("approved", "scheduled"), inDevelopment: by("in_progress", "ready_for_review", "changes_requested"), completed: by("completed", "closed"), open: rows.filter((r) => !CLOSED_STATUSES.includes(r.status)).length, awaitingClient: by("needs_clarification", "ready_for_review") };
}
