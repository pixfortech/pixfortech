import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { isStaff, type Actor } from "../auth/permissions";
import { AuthError } from "../auth/session";
import { accessibleProjectIds, projectClientIds, projectStaffIds, requireProject, usersByIds } from "./access";
import { notify } from "./notifications";
import { uid } from "./ids";
import { publish } from "../realtime/bus";

export async function listConversations(actor: Actor, projectId?: string) {
  const ids = projectId ? [(await requireProject(actor, projectId)).id] : await accessibleProjectIds(actor);
  if (!ids.length) return [];
  const conds = [inArray(schema.conversations.projectId, ids)];
  if (!isStaff(actor)) conds.push(eq(schema.conversations.internal, false));
  const rows = db.select({
    id: schema.conversations.id, title: schema.conversations.title, internal: schema.conversations.internal, projectId: schema.conversations.projectId, requestId: schema.conversations.requestId,
    lastMessageAt: schema.conversations.lastMessageAt, projectCode: schema.projects.code, projectTitle: schema.projects.title,
  }).from(schema.conversations).innerJoin(schema.projects, eq(schema.projects.id, schema.conversations.projectId)).where(and(...conds)).orderBy(desc(schema.conversations.lastMessageAt)).all();
  const reads = db.select().from(schema.conversationMembers).where(eq(schema.conversationMembers.userId, actor.id)).all();
  return rows.map((c) => {
    const lastRead = reads.find((r) => r.conversationId === c.id)?.lastReadAt ?? null;
    const unread = db.select({ n: sql<number>`count(*)` }).from(schema.messages).where(and(eq(schema.messages.conversationId, c.id), isNull(schema.messages.deletedAt), sql`${schema.messages.authorId} != ${actor.id}`, lastRead ? gt(schema.messages.createdAt, lastRead) : sql`1=1`)).get()?.n ?? 0;
    const last = db.select({ body: schema.messages.body, authorName: schema.users.name, createdAt: schema.messages.createdAt }).from(schema.messages).innerJoin(schema.users, eq(schema.users.id, schema.messages.authorId)).where(and(eq(schema.messages.conversationId, c.id), isNull(schema.messages.deletedAt))).orderBy(desc(schema.messages.createdAt)).limit(1).get() ?? null;
    return { ...c, unread, last };
  });
}

export async function conversationFor(actor: Actor, id: string) {
  const c = db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).get();
  if (!c) return null;
  const project = await requireProject(actor, c.projectId).catch(() => null);
  if (!project) return null;
  if (c.internal && !isStaff(actor)) return null;
  return { ...c, project };
}

export async function listMessages(actor: Actor, conversationId: string, opts: { after?: Date; limit?: number } = {}) {
  const c = await conversationFor(actor, conversationId);
  if (!c) throw new AuthError(403, "Conversation not found.");
  const conds = [eq(schema.messages.conversationId, conversationId), isNull(schema.messages.deletedAt)];
  if (opts.after) conds.push(gt(schema.messages.createdAt, opts.after));
  const rows = db.select({
    id: schema.messages.id, body: schema.messages.body, replyToId: schema.messages.replyToId, mentions: schema.messages.mentions, createdAt: schema.messages.createdAt, editedAt: schema.messages.editedAt,
    authorId: schema.messages.authorId, authorName: schema.users.name, authorImage: schema.users.image, authorRole: schema.users.role,
  }).from(schema.messages).innerJoin(schema.users, eq(schema.users.id, schema.messages.authorId)).where(and(...conds)).orderBy(asc(schema.messages.createdAt)).limit(opts.limit ?? 200).all();
  const files = rows.length ? db.select().from(schema.files).where(and(inArray(schema.files.messageId, rows.map((r) => r.id)), isNull(schema.files.deletedAt))).all() : [];
  // Read receipts: who has read up to when
  const members = db.select().from(schema.conversationMembers).where(eq(schema.conversationMembers.conversationId, conversationId)).all();
  const readers = usersByIds(members.map((m) => m.userId)).map((u) => ({ ...u, lastReadAt: members.find((m) => m.userId === u.id)?.lastReadAt ?? null }));
  return { conversation: c, messages: rows.map((m) => ({ ...m, files: files.filter((f) => f.messageId === m.id) })), readers };
}

export async function markConversationRead(actor: Actor, conversationId: string) {
  const c = await conversationFor(actor, conversationId);
  if (!c) return;
  db.insert(schema.conversationMembers).values({ conversationId, userId: actor.id, lastReadAt: new Date() })
    .onConflictDoUpdate({ target: [schema.conversationMembers.conversationId, schema.conversationMembers.userId], set: { lastReadAt: new Date() } }).run();
  publish({ type: "presence", audience: { projectIds: [c.projectId] }, payload: { conversationId, userId: actor.id, readAt: Date.now() } });
}

export function extractMentions(body: string, candidates: { id: string; name: string }[]): string[] {
  const out = new Set<string>();
  for (const c of candidates) {
    const first = c.name.split(" ")[0];
    if (new RegExp(`@${escapeRe(c.name)}\\b|@${escapeRe(first)}\\b`, "i").test(body)) out.add(c.id);
  }
  return [...out];
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function sendMessage(actor: Actor, conversationId: string, body: string, replyToId?: string | null) {
  const c = await conversationFor(actor, conversationId);
  if (!c) throw new AuthError(403, "Conversation not found.");
  const text = body.trim();
  if (!text) throw new AuthError(403, "Message is empty.");
  const project = c.project;
  const staffIds = projectStaffIds(project.id, project.managerId);
  const clientIds = c.internal ? [] : projectClientIds(project.id, project.organisationId);
  const participants = usersByIds([...new Set([...staffIds, ...clientIds])]);
  const mentions = extractMentions(text, participants);
  const id = uid();
  db.insert(schema.messages).values({ id, conversationId, authorId: actor.id, body: text.slice(0, 4000), replyToId: replyToId ?? null, mentions: mentions.length ? JSON.stringify(mentions) : null }).run();
  db.update(schema.conversations).set({ lastMessageAt: new Date() }).where(eq(schema.conversations.id, conversationId)).run();
  await markConversationRead(actor, conversationId);
  const authorName = participants.find((p) => p.id === actor.id)?.name ?? "Someone";
  const href = c.requestId ? `/requests/${c.requestId}` : `/projects/${project.id}/messages`;
  publish({ type: "message", audience: c.internal ? { staff: true } : { projectIds: [project.id], staff: true }, payload: { id, conversationId, projectId: project.id, authorId: actor.id, authorName, body: text.slice(0, 140), href, internal: c.internal } });
  const others = participants.map((p) => p.id).filter((pid) => pid !== actor.id && !mentions.includes(pid));
  await notify({ recipientIds: mentions, category: "mention", title: `${authorName} mentioned you`, body: text.slice(0, 140), href, projectId: project.id, actorId: actor.id });
  await notify({ recipientIds: others, category: "message", title: `${authorName} in ${c.title}`, body: text.slice(0, 140), href, projectId: project.id, actorId: actor.id });
  return { id, mentions };
}

export async function typing(actor: Actor, conversationId: string, name: string) {
  const c = await conversationFor(actor, conversationId);
  if (!c) return;
  publish({ type: "typing", audience: c.internal ? { staff: true } : { projectIds: [c.projectId], staff: true }, payload: { conversationId, userId: actor.id, name } });
}

export async function unreadMessageCount(actor: Actor): Promise<number> {
  const list = await listConversations(actor);
  return list.reduce((n, c) => n + c.unread, 0);
}
