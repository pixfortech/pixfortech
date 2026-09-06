import "server-only";
import { EventEmitter } from "node:events";

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

const emitter = globalThis.__pfBus ?? new EventEmitter();
emitter.setMaxListeners(1000);
if (process.env.NODE_ENV !== "production") globalThis.__pfBus = emitter;

export function publish(event: Omit<RealtimeEvent, "id" | "at">) {
  const full: RealtimeEvent = { ...event, id: crypto.randomUUID(), at: Date.now() };
  emitter.emit("event", full);
  return full;
}

export function subscribe(listener: (e: RealtimeEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

export type SubscriberScope = { userId: string; organisationId: string | null; staff: boolean; projectIds: Set<string> };

export function matches(e: RealtimeEvent, s: SubscriberScope): boolean {
  const a = e.audience;
  if (a.userIds?.includes(s.userId)) return true;
  if (a.staff && s.staff) return true;
  if (a.organisationIds && s.organisationId && a.organisationIds.includes(s.organisationId)) return true;
  if (a.projectIds?.some((p) => s.projectIds.has(p))) return true;
  return false;
}
