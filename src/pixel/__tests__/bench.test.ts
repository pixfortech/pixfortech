import { describe, expect, it } from "vitest";
import { emptyCycle, nextObject } from "../bench/cycle";
import { BENCH_OBJECTS, buildOrder, misplaceOptions, OBJECT_IDS, SMALL_OBJECT_IDS, objectById } from "../bench/objects";
import { Bench, layoutFor, PHASES, type Phase } from "../bench/bench";
import { mulberry } from "../behaviours";

describe("bench rotation", () => {
  it("plays every piece once per cycle and never opens a cycle with the piece that closed the last one", () => {
    const ids = OBJECT_IDS;
    const rnd = mulberry(11);
    let state = emptyCycle();
    const seen: string[] = [];
    for (let i = 0; i < ids.length * 5; i++) { const r = nextObject(ids, state, rnd); state = r.state; seen.push(r.id); }
    for (let c = 0; c < 5; c++) {
      const cycle = seen.slice(c * ids.length, (c + 1) * ids.length);
      expect([...new Set(cycle)].sort()).toEqual([...ids].sort());
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });
  it("copes with a single piece and with a pool that changed under it", () => {
    let s = emptyCycle();
    for (let i = 0; i < 3; i++) { const r = nextObject(["only"], s, mulberry(1)); s = r.state; expect(r.id).toBe("only"); }
    const r = nextObject(["a", "b"], { queue: ["zzz", "b"], last: "a" }, mulberry(2));
    expect(r.id).toBe("b");
  });
});

describe("bench pieces", () => {
  it("are small, well formed and original in shape", () => {
    expect(BENCH_OBJECTS.length).toBeGreaterThanOrEqual(12);
    for (const o of BENCH_OBJECTS) {
      const keys = new Set(o.cells.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(o.cells.length);
      expect(o.cells.length).toBeGreaterThanOrEqual(6);
      expect(o.cells.length).toBeLessThanOrEqual(26);
      expect(o.w).toBeLessThanOrEqual(8); expect(o.h).toBeLessThanOrEqual(6);
      for (const c of o.cells) { expect(c.x).toBeLessThan(o.w); expect(c.y).toBeLessThan(o.h); }
      expect(misplaceOptions(o, buildOrder(o)).length).toBeGreaterThan(0);
      if (o.small) { expect(o.w).toBeLessThanOrEqual(6); expect(o.cells.length).toBeLessThanOrEqual(20); }
    }
    expect(SMALL_OBJECT_IDS.length).toBeGreaterThanOrEqual(6);
    expect(objectById("nope").id).toBe(BENCH_OBJECTS[0].id);
  });
  it("builds upward: the first pixel placed is on the bottom row", () => {
    for (const o of BENCH_OBJECTS) { const order = buildOrder(o); if (o.mode !== "module") expect(order[0].y).toBe(Math.max(...o.cells.map((c) => c.y))); expect(order.length).toBe(o.cells.length); }
  });
});

function run(bench: Bench, until: () => boolean, dt = 40, cap = 400_000) {
  for (let i = 0; i < cap && !until(); i++) bench.update(dt);
}
const pattern = (pixels: { x: number; y: number }[]) => {
  const minX = Math.min(...pixels.map((p) => p.x)), minY = Math.min(...pixels.map((p) => p.y));
  return pixels.map((p) => `${p.x - minX},${p.y - minY}`).sort().join(" ");
};
const objectPattern = (id: string) => pattern(objectById(id).cells);

describe("bench cycle", () => {
  it("runs idea → gather → build → check → place → react → rest, places every piece exactly on its grid and never repeats a piece back to back", () => {
    const bench = new Bench(layoutFor(false), 7);
    const phases: Phase[] = [];
    const placedFrames: { id: string; pixels: { x: number; y: number }[] }[] = [];
    bench.events = {
      onPhase: (ph, id) => { phases.push(ph); if (ph === "react") placedFrames.push({ id, pixels: bench.frame().pixels.map((p) => ({ x: p.x, y: p.y })) }); },
    };
    run(bench, () => bench.cycles >= 16);
    // Phase order holds for every cycle (the very first "idea" fires before the listener is attached).
    const start = phases.indexOf("idea");
    expect(start).toBeLessThan(PHASES.length);
    for (let i = start; i < phases.length; i++) expect(phases[i]).toBe(PHASES[(i - start) % PHASES.length]);
    expect(bench.history.length).toBe(16);
    for (let i = 1; i < bench.history.length; i++) expect(bench.history[i]).not.toBe(bench.history[i - 1]);
    expect(new Set(bench.history.slice(0, OBJECT_IDS.length)).size).toBe(OBJECT_IDS.length);
    // At the moment of placement the piece is complete, integer-aligned, and identical to its design: the misplaced pixel has been corrected.
    for (const f of placedFrames) {
      expect(f.pixels.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true);
      expect(pattern(f.pixels)).toBe(objectPattern(f.id));
    }
  });
  it("lands one pixel a cell out during most builds and PiP fixes it at the check", () => {
    const bench = new Bench(layoutFor(false), 3);
    let misplacedSeen = 0, checked = 0;
    bench.events = { onPhase: (ph, id) => {
      if (ph !== "check") return;
      checked++;
      for (let i = 0; i < 25; i++) bench.update(40); // ~1s into the check, before the correction
      const pixels = bench.frame().pixels.filter((p) => p.a > 0.95 && p.s <= 1.001);
      const design = objectById(id).cells.length;
      const placed = pixels.slice(0, design);
      if (pattern(placed) !== objectPattern(id)) misplacedSeen++;
    } };
    run(bench, () => bench.cycles >= 10);
    expect(checked).toBe(10);
    expect(misplacedSeen).toBeGreaterThanOrEqual(4);
  });
  it("speaks rarely, only from the bench categories, and at most once per cycle", () => {
    const bench = new Bench(layoutFor(false), 21);
    run(bench, () => bench.cycles >= 20);
    expect(bench.sayLog.length).toBeGreaterThan(2);
    expect(bench.sayLog.length).toBeLessThan(20);
    for (const k of bench.sayLog) expect(["precisionBuild", "precisionInspect", "precisionComplete"]).toContain(k);
  });
  it("a poke pauses the work briefly without restarting the piece", () => {
    const bench = new Bench(layoutFor(false), 5);
    run(bench, () => bench.phase === "build");
    for (let i = 0; i < 12; i++) bench.update(40);
    const id = bench.objectId, before = bench.progress();
    expect(bench.poke()).toBe(true);
    expect(bench.poke()).toBe(false);
    for (let i = 0; i < 10; i++) bench.update(40); // 400ms of dizziness: nothing advances
    expect(bench.phase).toBe("build");
    expect(bench.progress()).toBe(before);
    for (let i = 0; i < 40; i++) bench.update(40);
    expect(bench.objectId).toBe(id);
    expect(bench.progress()).toBeGreaterThan(before);
    expect(bench.frame().pixels.length).toBeGreaterThan(0);
  });
  it("the phone layout builds only the small pieces and the static frame shows a finished piece on its grid", () => {
    const bench = new Bench(layoutFor(true), 9);
    run(bench, () => bench.cycles >= 8);
    for (const id of bench.history) expect(SMALL_OBJECT_IDS).toContain(id);
    const f = bench.staticFrame(true);
    expect(f.pip.blink).toBe(true);
    expect(f.grid?.a).toBeGreaterThan(0);
    const piece = f.pixels.filter((p) => p.a === 1);
    expect(pattern(piece)).toBe(objectPattern(bench.objectId));
  });
  it("loose pixels give way to the pointer, the piece under construction does not", () => {
    const bench = new Bench(layoutFor(false), 13);
    run(bench, () => bench.phase === "idea" && bench.frame().pixels.length > 3);
    for (let i = 0; i < 30; i++) bench.update(40);
    const still = bench.frame().pixels[0];
    bench.setPointer({ x: still.x + 0.6, y: still.y + 0.5 });
    const moved = bench.frame().pixels[0];
    expect(Math.hypot(moved.x - still.x, moved.y - still.y)).toBeGreaterThan(0.3);
    bench.setPointer(null);
    run(bench, () => bench.phase === "check");
    const cells = bench.frame().pixels.filter((p) => p.a > 0.95);
    bench.setPointer({ x: cells[0].x + 0.5, y: cells[0].y + 0.5 });
    const after = bench.frame().pixels.filter((p) => p.a > 0.95);
    expect(after[0].x).toBe(cells[0].x); expect(after[0].y).toBe(cells[0].y);
    expect(bench.frame().pip.state).toBe("guiding");
  });
});
