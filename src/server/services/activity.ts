import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { uid } from "./ids";
import { isStaff, type Actor } from "../auth/permissions";
import { publish } from "../realtime/bus";

export async function recordActivity(input: {
  organisationId: string; projectId?: string | null; actorId?: string | null; kind: string; summary: string;
  targetType?: string; targetId?: string; href?: string; internal?: boolean;
}) {
  const id = uid();
  (await db.insert(schema.activityEvents).values({
    id, organisationId: input.organisationId, projectId: input.projectId ?? null, actorId: input.actorId ?? null,
    kind: input.kind, summary: input.summary, targetType: input.targetType, targetId: input.targetId, href: input.href, internal: input.internal ?? false,
  }));
  if (input.projectId) (await publish({ type: "project.updated", audience: { projectIds: [input.projectId] }, payload: { projectId: input.projectId, kind: input.kind } }));
  return id;
}

export async function recordAudit(input: { actorId: string | null; action: string; targetType: string; targetId?: string; metadata?: Record<string, unknown>; ip?: string | null }) {
  (await db.insert(schema.auditEvents).values({
    id: uid(), actorId: input.actorId, action: input.action, targetType: input.targetType, targetId: input.targetId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null, ip: input.ip ?? null,
  }));
}

export async function listActivity(actor: Actor, opts: { projectIds: string[]; limit?: number; projectId?: string }) {
  const ids = opts.projectId ? [opts.projectId] : opts.projectIds;
  if (!ids.length) return [];
  const where = isStaff(actor)
    ? inArray(schema.activityEvents.projectId, ids)
    : and(inArray(schema.activityEvents.projectId, ids), eq(schema.activityEvents.internal, false));
  return (await db.select({
    id: schema.activityEvents.id, kind: schema.activityEvents.kind, summary: schema.activityEvents.summary, href: schema.activityEvents.href,
    createdAt: schema.activityEvents.createdAt, internal: schema.activityEvents.internal, projectId: schema.activityEvents.projectId,
    actorName: schema.users.name, actorImage: schema.users.image, projectTitle: schema.projects.title, projectCode: schema.projects.code,
  }).from(schema.activityEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.activityEvents.actorId))
    .leftJoin(schema.projects, eq(schema.projects.id, schema.activityEvents.projectId))
    .where(where).orderBy(desc(schema.activityEvents.createdAt)).limit(opts.limit ?? 30));
}

export async function listAudit(limit = 100) {
  return (await db.select({
    id: schema.auditEvents.id, action: schema.auditEvents.action, targetType: schema.auditEvents.targetType, targetId: schema.auditEvents.targetId,
    metadata: schema.auditEvents.metadata, ip: schema.auditEvents.ip, createdAt: schema.auditEvents.createdAt, actorName: schema.users.name, actorEmail: schema.users.email,
  }).from(schema.auditEvents).leftJoin(schema.users, eq(schema.users.id, schema.auditEvents.actorId)).orderBy(desc(schema.auditEvents.createdAt)).limit(limit));
}
