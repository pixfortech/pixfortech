import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import path from "node:path";
import { db, schema } from "../db";
import { isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectClientIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { recordActivity, recordAudit } from "./activity";
import { notify } from "./notifications";
import { uid } from "./ids";
import { newStorageKey, scanUpload, storage } from "../storage";
import { publish } from "../realtime/bus";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Allowed types by extension and MIME, plus magic-byte checks for binary formats. */
const ALLOWED: Record<string, string[]> = {
  png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"], svg: ["image/svg+xml"], gif: ["image/gif"],
  pdf: ["application/pdf"], doc: ["application/msword"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"], xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  txt: ["text/plain"], md: ["text/markdown", "text/plain"], csv: ["text/csv", "text/plain"], zip: ["application/zip", "application/x-zip-compressed"],
};

function sniff(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buf.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b) return "application/zip"; // zip, docx, xlsx
  if (buf[0] === 0xd0 && buf[1] === 0xcf) return "application/msword"; // legacy office
  return null;
}

/** Validates name, size, extension, declared MIME and magic bytes. Never trusts the extension alone. */
export function validateUpload(name: string, declaredMime: string, buf: Buffer): { ok: true; mime: string; ext: string } | { ok: false; reason: string } {
  if (buf.length === 0) return { ok: false, reason: "The file is empty." };
  if (buf.length > MAX_FILE_BYTES) return { ok: false, reason: "Files must be under 25 MB." };
  const ext = path.extname(name).replace(".", "").toLowerCase();
  const allowed = ALLOWED[ext];
  if (!allowed) return { ok: false, reason: `“.${ext || "?"}” files are not accepted.` };
  const sniffed = sniff(buf);
  const textual = ["txt", "md", "csv", "svg"].includes(ext);
  if (!textual) {
    const expected = ext === "docx" || ext === "xlsx" ? "application/zip" : ext === "doc" || ext === "xls" ? "application/msword" : allowed[0];
    if (sniffed !== expected) return { ok: false, reason: "The file contents do not match its extension." };
  } else if (ext === "svg") {
    const text = buf.toString("utf8");
    if (!/<svg[\s>]/i.test(text.slice(0, 2048))) return { ok: false, reason: "That does not look like an SVG." };
    if (/<script|on[a-z]+\s*=|javascript:|<foreignObject/i.test(text)) return { ok: false, reason: "SVGs with scripts or event handlers are not accepted." };
  }
  const mime = allowed.includes(declaredMime) ? declaredMime : allowed[0];
  return { ok: true, mime, ext };
}

/** Strip control characters and path separators from a user-supplied name. */
export function safeFilename(name: string): string {
  const base = path.basename(name);
  let out = "";
  for (const ch of base) { const c = ch.charCodeAt(0); out += c < 32 || c === 127 ? "" : ch; }
  return out.replace(/[\\/]/g, "").trim().slice(0, 180) || "file";
}

export type FileTarget = { projectId: string; taskId?: string | null; requestId?: string | null; messageId?: string | null; approvalId?: string | null; clientVisible?: boolean; supersedesId?: string | null };

export async function storeFile(actor: Actor, target: FileTarget, name: string, declaredMime: string, buf: Buffer) {
  const project = await requireProject(actor, target.projectId);
  const v = validateUpload(name, declaredMime, buf);
  if (!v.ok) throw new AuthError(403, v.reason);
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
