import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { AuthError } from "../auth/session";
import type { Actor } from "../auth/permissions";
import { requireProject } from "./access";
import { MAX_FILE_BYTES, storeFile, validateFileTarget } from "./files";
import { storage } from "../storage";

export const CHUNK_BYTES = 3 * 1024 * 1024;
const inputSchema = z.object({
  name: z.string().min(1).max(240), mime: z.string().max(150), size: z.number().int().min(1).max(MAX_FILE_BYTES),
  target: z.object({ projectId: z.string().min(1), taskId: z.string().optional(), requestId: z.string().optional(), clientVisible: z.boolean().optional() }),
});

export async function beginUpload(actor: Actor, input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new AuthError(422, "Invalid upload. Files must be at most 25 MB.");
  const value = parsed.data;
  await validateFileTarget(actor, value.target);
  // Shared admission control, using the database rather than an instance-local map.
  const window = Math.floor(Date.now() / 600_000);
  const key = `upload:${actor.id}:${window}`;
  const [rate] = await db.insert(schema.rateLimit).values({ id: crypto.randomUUID(), key, count: 1, lastRequest: Date.now() })
    .onConflictDoUpdate({ target: schema.rateLimit.key, set: { count: sql`${schema.rateLimit.count} + 1` } }).returning({ count: schema.rateLimit.count });
  if (rate.count > 40) throw new AuthError(422, "Too many uploads. Try again in a few minutes.");
  const id = crypto.randomUUID();
  await db.insert(schema.uploadSessions).values({ id, userId: actor.id, projectId: value.target.projectId, ...value, expiresAt: new Date(Date.now() + 3600_000) });
  return { id, chunkBytes: CHUNK_BYTES };
}

async function sessionFor(actor: Actor, id: string) {
  const [session] = await db.select().from(schema.uploadSessions).where(and(eq(schema.uploadSessions.id, id), eq(schema.uploadSessions.userId, actor.id), gt(schema.uploadSessions.expiresAt, new Date()))).limit(1);
  if (!session || session.status !== "pending") throw new AuthError(404, "Upload not found or expired.");
  await requireProject(actor, session.projectId);
  return session;
}

const partKey = (id: string, part: number) => `staging/${id}/${part}`;

export async function putChunk(actor: Actor, id: string, part: number, request: Request) {
  const session = await sessionFor(actor, id);
  const parts = Math.ceil(session.size / CHUNK_BYTES);
  if (!Number.isInteger(part) || part < 0 || part >= parts) throw new AuthError(422, "Invalid chunk.");
  const expected = Math.min(CHUNK_BYTES, session.size - part * CHUNK_BYTES);
  if (Number(request.headers.get("content-length")) > CHUNK_BYTES) throw new AuthError(422, "Chunk is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(422, "Empty chunk.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > expected) { await reader.cancel(); throw new AuthError(422, "Chunk is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (bytes !== expected) throw new AuthError(422, "Incomplete chunk.");
  await storage().put(partKey(id, part), Buffer.concat(chunks), "application/octet-stream");
}

export async function finishUpload(actor: Actor, id: string) {
  const session = await sessionFor(actor, id);
  const [lock] = await db.update(schema.uploadSessions).set({ status: "validating" })
    .where(and(eq(schema.uploadSessions.id, id), eq(schema.uploadSessions.userId, actor.id), eq(schema.uploadSessions.status, "pending"))).returning({ id: schema.uploadSessions.id });
  if (!lock) throw new AuthError(422, "Upload is already being completed.");
  const count = Math.ceil(session.size / CHUNK_BYTES);
  try {
    const chunks: Buffer[] = [];
    for (let part = 0; part < count; part++) {
      const object = await storage().get(partKey(id, part));
      if (!object) throw new AuthError(422, "Upload is incomplete.");
      const bytes = Buffer.from(await new Response(object.stream).arrayBuffer());
      if (bytes.length !== Math.min(CHUNK_BYTES, session.size - part * CHUNK_BYTES)) throw new AuthError(422, "Invalid chunk size.");
      chunks.push(bytes);
    }
    // Original complete-file MIME/magic-byte validation and project authorization.
    const file = await storeFile(actor, session.target, session.name, session.mime, Buffer.concat(chunks));
    await db.update(schema.uploadSessions).set({ status: "complete" }).where(eq(schema.uploadSessions.id, id));
    return file;
  } catch (error) {
    await db.update(schema.uploadSessions).set({ status: "failed" }).where(eq(schema.uploadSessions.id, id));
    throw error;
  } finally {
    await Promise.allSettled(Array.from({ length: count }, (_, part) => storage().delete(partKey(id, part))));
  }
}
