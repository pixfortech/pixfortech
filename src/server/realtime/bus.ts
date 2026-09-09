import "server-only";
import { EventEmitter } from "node:events";
import { and, desc, gte, lt, or, sql } from "drizzle-orm";
import { db, schema } from "../db";

/**
 * Realtime event bus. In-process for a single Node server; the publish
 * interface is the seam for Redis pub/sub or a hosted service (Pusher, Ably)
 * when running multiple instances.
 */
export type RealtimeEvent = {
  id: string;
  type:
    | "notification" | "message" | "request.updated" | "request.created" | "task.updated" | "task.created"
    | "project.updated" | "approval.updated" | "file.created" | "typing" | "presence";
  at: number;
  /** Delivery targets. A subscriber receives the event when any match. */
  audience: { userIds?: string[]; projectIds?: string[]; organisationIds?: string[]; staff?: boolean };
  payload: Record<string, unknown>;
};

declare global {
  var __pfBus: EventEmitter | undefined;
}

// One emitter per Node process. Route handlers, server actions and pages are
// bundled separately in production, so the module can be instantiated more
// than once; sharing through globalThis keeps every publisher and subscriber
// on the same bus (and survives HMR in development).
const emitter = globalThis.__pfBus ?? new EventEmitter();
emitter.setMaxListeners(1000);
globalThis.__pfBus = emitter;

export async function publish(event: Omit<RealtimeEvent, "id" | "at">) {
  const full: RealtimeEvent = { ...event, id: crypto.randomUUID(), at: Date.now() };
  if (process.env.NODE_ENV !== "test") {
    await db.insert(schema.realtimeEvents).values({ id: full.id, type: full.type, audience: full.audience, payload: full.payload });
    if (Math.random() < 0.01) await pruneEvents().catch(() => console.error("Realtime retention cleanup failed"));
  }
  emitter.emit("event", full);
  return full;
}

/** Short authenticated reads replace long-lived connections on Netlify. */
export async function readEvents(scope: SubscriberScope, since: Date) {
  const audience = schema.realtimeEvents.audience;
  const targets = [sql`${audience} @> ${JSON.stringify({ userIds: [scope.userId] })}::jsonb`];
  if (scope.staff) targets.push(sql`${audience} @> '{"staff":true}'::jsonb`);
  if (scope.organisationId) targets.push(sql`${audience} @> ${JSON.stringify({ organisationIds: [scope.organisationId] })}::jsonb`);
  for (const id of scope.projectIds) targets.push(sql`${audience} @> ${JSON.stringify({ projectIds: [id] })}::jsonb`);
  const rows = await db.select().from(schema.realtimeEvents)
    .where(and(gte(schema.realtimeEvents.createdAt, since), or(...targets)))
    .orderBy(desc(schema.realtimeEvents.createdAt)).limit(501);
  return { overflow: rows.length > 500, events: rows.slice(0, 500).reverse().map((r) => ({ id: r.id, type: r.type as RealtimeEvent["type"], at: r.createdAt.getTime(), audience: r.audience, payload: r.payload })).filter((e) => matches(e, scope)) };
}

export async function pruneEvents() {
  await db.delete(schema.realtimeEvents).where(lt(schema.realtimeEvents.createdAt, new Date(Date.now() - 86_400_000)));
}

export function subscribe(listener: (e: RealtimeEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

export type SubscriberScope = { userId: string; organisationId: string | null; staff: boolean; projectIds: Set<string> };

export function matches(e: RealtimeEvent, s: SubscriberScope): boolean {
  // A broad staff/user audience must not bypass current project membership.
  if (typeof e.payload.projectId === "string" && !s.projectIds.has(e.payload.projectId)) return false;
  const a = e.audience;
  if (a.userIds?.includes(s.userId)) return true;
  if (a.staff && s.staff) return true;
  if (a.organisationIds && s.organisationId && a.organisationIds.includes(s.organisationId)) return true;
  if (a.projectIds?.some((p) => s.projectIds.has(p))) return true;
  return false;
}
