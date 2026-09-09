import { describe, expect, it } from "vitest";
import { countLines, GAME_IDS, gameLibrary, linesFor, pipLibrary } from "../behaviour/messages";
import { LINE_EXPIRY_MS, mergeHistory, pickGame, pickLine, recordGame, recordShown, unseenCount, type GameHistory, type ShownHistory } from "../behaviour/selection";

const seq = (values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

describe("message library", () => {
  it("has unique, stable ids and a substantial size", () => {
    const ids = new Set<string>();
    for (const [k, list] of Object.entries(pipLibrary)) for (const l of list) { expect(l.id.startsWith(`${k}.`)).toBe(true); expect(ids.has(l.id)).toBe(false); ids.add(l.id); }
    for (const [g, spec] of Object.entries(gameLibrary)) for (const phase of ["invite", "start", "win", "lose", "exit"] as const) { expect(spec[phase].length).toBeGreaterThan(0); for (const l of spec[phase]) { expect(l.id.startsWith(`game.${g}.${phase}`)).toBe(true); expect(ids.has(l.id)).toBe(false); ids.add(l.id); } }
    expect(countLines()).toBeGreaterThanOrEqual(200);
    expect(Object.keys(pipLibrary).length).toBeGreaterThanOrEqual(35);
    expect(GAME_IDS).toHaveLength(5);
  });
  it("never uses the exact line the brief offered as an example", () => {
    for (const l of pipLibrary.restore) expect(l.text).not.toBe("I knew you'd miss me. I gave it seven seconds.");
  });
  it("resolves game keys", () => {
    expect(linesFor("game.glitch.win").length).toBeGreaterThan(0);
    expect(linesFor("poke").length).toBeGreaterThan(0);
  });
});

describe("pickLine", () => {
  const list = pipLibrary.poke;
  it("shows every line once before any repeat, then goes silent until expiry", () => {
    let history: ShownHistory = {};
    const seen: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const p = pickLine(list, history, 1000 + i, seq([0.37]));
      expect(p).not.toBeNull();
      expect(seen).not.toContain(p!.line.id);
      seen.push(p!.line.id);
      history = recordShown(history, p!.line.id, 1000 + i);
    }
    expect(seen.length).toBe(list.length);
    expect(pickLine(list, history, 5000, seq([0.1]))).toBeNull();
    const later = pickLine(list, history, 5000 + LINE_EXPIRY_MS, seq([0]));
    expect(later?.exhausted).toBe(true);
    expect(later?.line.id).toBe(seen[0]); // oldest first
  });
  it("returns null for empty categories and merges histories by latest timestamp", () => {
    expect(pickLine([], {}, 1)).toBeNull();
    expect(mergeHistory({ a: 1, b: 5 }, { b: 2, c: 3 })).toEqual({ a: 1, b: 5, c: 3 });
    expect(unseenCount(list, { [list[0].id]: 1 })).toBe(list.length - 1);
  });
  it("caps history size, dropping the oldest entries", () => {
    let h: ShownHistory = {};
    for (let i = 0; i < 700; i++) h = recordShown(h, `x.${i}`, i, 600);
    expect(Object.keys(h).length).toBe(600);
    expect(h["x.0"]).toBeUndefined();
    expect(h["x.699"]).toBe(699);
  });
});

describe("game rotation", () => {
  const all = ["forge", "glitch", "spark", "recall", "hotforge"];
  it("never offers the same game twice in a session and cycles through all before resetting", () => {
    let history: GameHistory = { played: [], offered: [], last: null };
    const session = { offered: [] as string[] };
    const order: string[] = [];
    for (let i = 0; i < all.length; i++) {
      const g = pickGame(all, history, session, seq([0.99]));
      expect(g).not.toBeNull();
      expect(order).not.toContain(g);
      order.push(g!);
      session.offered.push(g!);
      history = recordGame(all, history, g!, i % 2 === 0);
    }
    expect([...order].sort()).toEqual([...all].sort());
    // Everything offered this session: nothing left to offer now.
    expect(pickGame(all, history, session)).toBeNull();
    // History reset after a full cycle, but the last game is remembered.
    expect(history.offered).toEqual([]);
    expect(history.last).toBe(order[order.length - 1]);
  });
  it("avoids the last game of the previous visit when a new cycle starts", () => {
    const history: GameHistory = { played: [], offered: [], last: "spark" };
    const picks = new Set<string>();
    for (let i = 0; i < 50; i++) picks.add(pickGame(all, history, { offered: [] }, seq([i / 50]))!);
    expect(picks.has("spark")).toBe(false);
    expect(picks.size).toBe(all.length - 1);
  });
  it("excludes games already played across visits", () => {
    const history: GameHistory = { played: ["forge", "glitch"], offered: ["recall"], last: "recall" };
    const picks = new Set<string>();
    for (let i = 0; i < 40; i++) picks.add(pickGame(all, history, { offered: [] }, seq([i / 40]))!);
    expect([...picks].sort()).toEqual(["hotforge", "spark"]);
  });
});
