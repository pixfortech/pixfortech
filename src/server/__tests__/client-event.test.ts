import { describe, expect, it } from "vitest";
import { clientEvent } from "../realtime/client-event";

describe("realtime delivery identity", () => {
  it("preserves the notification id so live and saved rows reconcile", () => {
    const result = clientEvent({ id: "delivery-1", type: "notification", at: 123, audience: { userIds: ["recipient"] }, payload: { id: "notification-1", eventId: "untrusted", at: 0 } });
    expect(result.data).toEqual({ id: "notification-1", eventId: "delivery-1", at: 123 });
  });
  it("keeps successive updates to the same resource as distinct deliveries", () => {
    const event = { type: "task.updated" as const, at: 123, audience: {}, payload: { id: "task-1" } };
    const first = clientEvent({ ...event, id: "delivery-1" });
    const next = clientEvent({ ...event, id: "delivery-2" });
    expect(first.data.id).toBe(next.data.id);
    expect(first.data.eventId).not.toBe(next.data.eventId);
  });
});
