import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectClientIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { recordActivity, recordAudit } from "./activity";
import { notify } from "./notifications";
import { uid } from "./ids";
import { newStorageKey, scanUpload, storage } from "../storage";
import { publish } from "../realtime/bus";

export { MAX_FILE_BYTES, validateUpload, safeFilename } from "./upload-validation";
import { validateUpload, safeFilename } from "./upload-validation";

export type FileTarget = { projectId: string; taskId?: string | null; requestId?: string | null; messageId?: string | null; approvalId?: string | null; clientVisible?: boolean; supersedesId?: string | null };

export async function storeFile(actor: Actor, target: FileTarget, name: string, declaredMime: string, buf: Buffer) {
  const project = await requireProject(actor, target.projectId);
  const v = validateUpload(name, declaredMime, buf);
  if (!v.ok) throw new AuthError(422, v.reason);
  const key = newStorageKey(v.ext);
  const scan = await scanUpload(buf, v.mime);
  if (scan === "flagged") throw new AuthError(403, "The file was flagged by the scanner.");
  await storage().put(key, buf, v.mime);
  const id = uid();
  let version = 1;
  if (target.supersedesId) {
    const prev = db.select().from(schema.files).where(eq(schema.files.id, target.supersedesId)).get();
    if (prev && prev.projectId === project.id) version = prev.version + 1;
  }
  const safeName = safeFilename(name);
  const clientVisible = isStaff(actor) ? (target.clientVisible ?? true) : true;
  db.insert(schema.files).values({
    id, organisationId: project.organisationId, projectId: project.id, taskId: target.taskId ?? null, requestId: target.requestId ?? null, messageId: target.messageId ?? null, approvalId: target.approvalId ?? null,
    name: safeName, mime: v.mime, size: buf.length, storageKey: key, driver: storage().name, version, supersedesId: target.supersedesId ?? null, uploaderId: actor.id, clientVisible, scanStatus: scan,
  }).run();
  recordActivity({ organisationId: project.organisationId, projectId: project.id, actorId: actor.id, kind: "file.uploaded", summary: `uploaded ${safeName}`, targetType: "file", targetId: id, href: `/projects/${project.id}/files`, internal: !clientVisible });
  if (!target.messageId) {
    const recipients = isStaff(actor) ? (clientVisible ? projectClientIds(project.id, project.organisationId) : []) : projectStaffIds(project.id, project.managerId);
    await notify({ recipientIds: recipients, category: "file", title: `New file on ${project.code}`, body: safeName, href: `/projects/${project.id}/files`, projectId: project.id, actorId: actor.id });
  }
  publish({ type: "file.created", audience: { projectIds: [project.id] }, payload: { id, projectId: project.id } });
  return { id, name: safeName, mime: v.mime, size: buf.length };
}

export async function listFiles(actor: Actor, filter: { projectId?: string; requestId?: string; taskId?: string } = {}) {
  const ids = filter.projectId ? [(await requireProject(actor, filter.projectId)).id] : await accessibleProjectIds(actor);
  if (!ids.length) return [];
  const conds = [inArray(schema.files.projectId, ids), isNull(schema.files.deletedAt)];
  if (!isStaff(actor)) conds.push(eq(schema.files.clientVisible, true));
  if (filter.requestId) conds.push(eq(schema.files.requestId, filter.requestId));
  if (filter.taskId) conds.push(eq(schema.files.taskId, filter.taskId));
  const rows = db.select({
    id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size, version: schema.files.version, createdAt: schema.files.createdAt, clientVisible: schema.files.clientVisible,
    projectId: schema.files.projectId, requestId: schema.files.requestId, taskId: schema.files.taskId, uploaderId: schema.files.uploaderId, projectCode: schema.projects.code, projectTitle: schema.projects.title, supersedesId: schema.files.supersedesId,
  }).from(schema.files).innerJoin(schema.projects, eq(schema.projects.id, schema.files.projectId)).where(and(...conds)).orderBy(desc(schema.files.createdAt)).all();
  const people = usersByIds([...new Set(rows.map((r) => r.uploaderId))]);
  return rows.map((r) => ({ ...r, uploader: people.find((p) => p.id === r.uploaderId) ?? null }));
}

/** Resolves a file the actor may read, or null. */
export async function fileFor(actor: Actor, id: string) {
  const f = db.select().from(schema.files).where(and(eq(schema.files.id, id), isNull(schema.files.deletedAt))).get();
  if (!f || !f.projectId) return null;
  const project = await requireProject(actor, f.projectId).catch(() => null);
  if (!project) return null;
  if (!isStaff(actor) && !f.clientVisible) return null;
  return f;
}

export async function deleteFile(actor: Actor, id: string) {
  const f = await fileFor(actor, id);
  if (!f) throw new AuthError(403, "File not found.");
  if (!isStaff(actor) && f.uploaderId !== actor.id) throw new AuthError(403, "You can only remove files you uploaded.");
  db.update(schema.files).set({ deletedAt: new Date() }).where(eq(schema.files.id, id)).run();
  await storage().delete(f.storageKey);
  recordAudit({ actorId: actor.id, action: "file.delete", targetType: "file", targetId: id, metadata: { name: f.name, projectId: f.projectId } });
  if (f.projectId) publish({ type: "file.created", audience: { projectIds: [f.projectId] }, payload: { id, projectId: f.projectId, deleted: true } });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
