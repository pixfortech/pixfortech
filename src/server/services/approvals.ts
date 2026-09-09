import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { canDecideApprovals, isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectClientIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { recordActivity } from "./activity";
import { notify } from "./notifications";
import { uid } from "./ids";
import { publish } from "../realtime/bus";

export const APPROVAL_TYPE_LABELS: Record<string, string> = { design: "Design", milestone: "Milestone", request: "Change request", content: "Content", staging: "Staging release", delivery: "Final delivery" };

export async function listApprovals(actor: Actor, filter: { projectId?: string; status?: string } = {}) {
  const ids = filter.projectId ? [(await requireProject(actor, filter.projectId)).id] : await accessibleProjectIds(actor);
  if (!ids.length) return [];
  const conds = [inArray(schema.approvals.projectId, ids)];
  if (filter.status) conds.push(eq(schema.approvals.status, filter.status as "pending"));
  const rows = (await db.select({
    id: schema.approvals.id, type: schema.approvals.type, title: schema.approvals.title, description: schema.approvals.description, status: schema.approvals.status, versionLabel: schema.approvals.versionLabel,
    dueDate: schema.approvals.dueDate, createdAt: schema.approvals.createdAt, decidedAt: schema.approvals.decidedAt, projectId: schema.approvals.projectId, requestId: schema.approvals.requestId, milestoneId: schema.approvals.milestoneId,
    requestedById: schema.approvals.requestedById, projectCode: schema.projects.code, projectTitle: schema.projects.title,
  }).from(schema.approvals).innerJoin(schema.projects, eq(schema.projects.id, schema.approvals.projectId)).where(and(...conds)).orderBy(desc(schema.approvals.createdAt)));
  const people = (await usersByIds([...new Set(rows.map((r) => r.requestedById))]));
  return rows.map((r) => ({ ...r, requestedBy: people.find((p) => p.id === r.requestedById) ?? null }));
}

export async function getApproval(actor: Actor, id: string) {
  const a = (await db.select().from(schema.approvals).where(eq(schema.approvals.id, id)).limit(1))[0];
  if (!a) return null;
  const project = await requireProject(actor, a.projectId).catch(() => null);
  if (!project) return null;
  const decisions = (await db.select({ id: schema.approvalDecisions.id, decision: schema.approvalDecisions.decision, comment: schema.approvalDecisions.comment, versionLabel: schema.approvalDecisions.versionLabel, createdAt: schema.approvalDecisions.createdAt, userName: schema.users.name, userImage: schema.users.image })
    .from(schema.approvalDecisions).innerJoin(schema.users, eq(schema.users.id, schema.approvalDecisions.userId)).where(eq(schema.approvalDecisions.approvalId, id)).orderBy(asc(schema.approvalDecisions.createdAt)));
  const files = (await db.select().from(schema.files).where(eq(schema.files.approvalId, id)));
  return { ...a, project, decisions, files, requestedBy: (await usersByIds([a.requestedById]))[0] ?? null };
}

export async function requestApproval(actor: Actor, input: { projectId: string; type: (typeof schema.APPROVAL_TYPES)[number]; title: string; description?: string; milestoneId?: string | null; requestId?: string | null; versionLabel?: string | null; dueDate?: Date | null }) {
  if (!isStaff(actor)) throw new AuthError(403, "Only staff can request approvals.");
  const project = await requireProject(actor, input.projectId);
  const id = uid();
  (await db.insert(schema.approvals).values({ id, organisationId: project.organisationId, projectId: project.id, type: input.type, title: input.title, description: input.description ?? null, milestoneId: input.milestoneId ?? null, requestId: input.requestId ?? null, versionLabel: input.versionLabel ?? null, requestedById: actor.id, dueDate: input.dueDate ?? null }));
  if (input.milestoneId) (await db.update(schema.milestones).set({ status: "awaiting_approval" }).where(eq(schema.milestones.id, input.milestoneId)));
  (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "approval.requested", summary: `requested approval: ${input.title}`, targetType: "approval", targetId: id, href: `/projects/${project.id}/approvals` }));
  await notify({ recipientIds: (await projectClientIds(project.id, project.organisationId)), category: "approval", title: `Approval requested: ${input.title}`, body: `${project.title} · ${APPROVAL_TYPE_LABELS[input.type]}`, href: `/projects/${project.id}/approvals`, projectId: project.id, actorId: actor.id });
  (await publish({ type: "approval.updated", audience: { projectIds: [project.id], staff: true }, payload: { id, projectId: project.id } }));
  return id;
}

export async function decideApproval(actor: Actor, id: string, decision: "approved" | "changes_requested" | "comment", comment?: string) {
  const a = (await db.select().from(schema.approvals).where(eq(schema.approvals.id, id)).limit(1))[0];
  if (!a) throw new AuthError(403, "Approval not found.");
  const project = await requireProject(actor, a.projectId);
  if (decision !== "comment" && !canDecideApprovals(actor)) throw new AuthError(403, "Only the client can approve or request changes.");
  if (decision !== "comment" && a.status !== "pending") throw new AuthError(403, "This approval has already been decided.");
  (await db.insert(schema.approvalDecisions).values({ id: uid(), approvalId: id, userId: actor.id, decision, comment: comment ?? null, versionLabel: a.versionLabel }));
  if (decision !== "comment") {
    (await db.update(schema.approvals).set({ status: decision, decidedAt: new Date() }).where(eq(schema.approvals.id, id)));
    if (a.milestoneId) (await db.update(schema.milestones).set({ status: decision === "approved" ? "completed" : "in_progress", progress: decision === "approved" ? 100 : undefined }).where(eq(schema.milestones.id, a.milestoneId)));
    if (a.requestId) (await db.update(schema.requests).set({ status: decision === "approved" ? "completed" : "changes_requested", updatedAt: new Date() }).where(eq(schema.requests.id, a.requestId)));
  }
  const label = decision === "approved" ? "approved" : decision === "changes_requested" ? "requested changes to" : "commented on";
  (await recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: `approval.${decision}`, summary: `${label} “${a.title}”${comment ? ` · ${comment.slice(0, 80)}` : ""}`, targetType: "approval", targetId: id, href: `/projects/${project.id}/approvals` }));
  const recipients = isStaff(actor) ? (await projectClientIds(project.id, project.organisationId)) : [...(await projectStaffIds(project.id, project.managerId)), a.requestedById];
  await notify({ recipientIds: recipients, category: "approval", title: decision === "approved" ? `Approved: ${a.title}` : decision === "changes_requested" ? `Changes requested: ${a.title}` : `Comment on approval: ${a.title}`, body: comment?.slice(0, 140) ?? project.title, href: `/projects/${project.id}/approvals`, projectId: project.id, actorId: actor.id });
  (await publish({ type: "approval.updated", audience: { projectIds: [project.id], staff: true }, payload: { id, projectId: project.id, status: decision } }));
}
