import { afterEach, describe, expect, it, vi } from "vitest";
import { matches, publish, subscribe, type RealtimeEvent, type SubscriberScope } from "../realtime/bus";
import { newStorageKey, signDownload, verifyDownload } from "../storage";

const ev = (audience: RealtimeEvent["audience"]): RealtimeEvent => ({ id: "e1", type: "notification", at: 0, audience, payload: {} });
const scope = (over: Partial<SubscriberScope> = {}): SubscriberScope => ({ userId: "u1", organisationId: "org-a", staff: false, projectIds: new Set(["p1"]), ...over });

describe("realtime audience matching", () => {
  it("delivers direct user events only to that user", () => {
    expect(matches(ev({ userIds: ["u1"] }), scope())).toBe(true);
    expect(matches(ev({ userIds: ["u2"] }), scope())).toBe(false);
  });
  it("keeps staff-only events away from clients", () => {
    expect(matches(ev({ staff: true }), scope())).toBe(false);
    expect(matches(ev({ staff: true }), scope({ staff: true, organisationId: null }))).toBe(true);
  });
  it("scopes organisation and project events to their tenants", () => {
    expect(matches(ev({ organisationIds: ["org-a"] }), scope())).toBe(true);
    expect(matches(ev({ organisationIds: ["org-b"] }), scope())).toBe(false);
    expect(matches(ev({ projectIds: ["p1"] }), scope())).toBe(true);
    expect(matches(ev({ projectIds: ["p9"] }), scope())).toBe(false);
    expect(matches(ev({ organisationIds: ["org-a"] }), scope({ organisationId: null }))).toBe(false);
  });
  it("drops events with an empty audience", () => {
    expect(matches(ev({}), scope())).toBe(false);
  });
  it("does not let staff or direct-user audiences bypass project access", () => {
    const event = { ...ev({ staff: true, userIds: ["u1"] }), payload: { projectId: "foreign" } };
    expect(matches(event, scope({ staff: true }))).toBe(false);
    expect(matches({ ...event, payload: { projectId: "p1" } }, scope({ staff: true }))).toBe(true);
  });
  it("publishes to subscribers and stops after unsubscribe", () => {
    const seen: string[] = [];
    const off = subscribe((e) => seen.push(e.type));
    publish({ type: "message", audience: { userIds: ["u1"] }, payload: {} });
    off();
    publish({ type: "message", audience: { userIds: ["u1"] }, payload: {} });
    expect(seen).toEqual(["message"]);
  });
});

describe("signed downloads", () => {
  afterEach(() => vi.useRealTimers());
  it("verifies a token for the same file and user", () => {
    const t = signDownload("f1", "u1");
    expect(verifyDownload("f1", "u1", t)).toBe(true);
  });
  it("rejects tokens for another file, another user, or tampered", () => {
    const t = signDownload("f1", "u1");
    expect(verifyDownload("f2", "u1", t)).toBe(false);
    expect(verifyDownload("f1", "u2", t)).toBe(false);
    expect(verifyDownload("f1", "u1", t.slice(0, -2) + "zz")).toBe(false);
    expect(verifyDownload("f1", "u1", null)).toBe(false);
    expect(verifyDownload("f1", "u1", "garbage")).toBe(false);
  });
  it("expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const t = signDownload("f1", "u1", 60);
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    expect(verifyDownload("f1", "u1", t)).toBe(false);
  });
});

describe("storage keys", () => {
  it("are random, dated and never contain the original name", () => {
    const k = newStorageKey("PnG");
    expect(k).toMatch(/^\d{4}\/\d{2}\/[a-f0-9]{32}\.png$/);
    expect(newStorageKey("../x")).toMatch(/\.x$/);
    expect(newStorageKey("")).not.toContain(".");
    expect(newStorageKey("png")).not.toBe(newStorageKey("png"));
  });
});
