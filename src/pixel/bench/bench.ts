/**
 * PiP's bench: the state machine behind the home-page workstation. Pure and
 * time-stepped (no DOM), so it can be driven by requestAnimationFrame in the
 * browser and by a fake clock in tests.
 *
 * One cycle: idea → gather → build → check → place → react → rest. The only
 * randomness is which piece comes next (a shuffled, non-repeating cycle) and
 * the small choices inside a plan: which pixel lands one cell out, whether
 * PiP pauses to inspect a pixel, which reaction closes the cycle, and whether
 * he says anything at all. Everything else is deterministic interpolation:
 * pixels travel along planned paths, the piece snaps to its grid, and the
 * frame the renderer draws is computed from phase time, not accumulated.
 */
import type { MascotState } from "../behaviour/store";
import { mulberry } from "../behaviours";
import { emptyCycle, nextObject, type CycleState } from "./cycle";
import { buildOrder, misplaceOptions, objectById, OBJECT_IDS, SMALL_OBJECT_IDS, type BenchObject, type Fill, type ObjectCell } from "./objects";

export type Phase = "idea" | "gather" | "build" | "check" | "place" | "react" | "rest";
export const PHASES: readonly Phase[] = ["idea", "gather", "build", "check", "place", "react", "rest"];
export type SayKey = "precisionBuild" | "precisionInspect" | "precisionComplete" | "benchPoke";
export type Arms = "down" | "carry" | "tap" | "point" | "fold" | "up" | "dustA" | "dustB";
export type Reaction = "nod" | "dustoff" | "recheck" | "adjust" | "look" | "fold";

export type Layout = {
  cols: number; rows: number; floorY: number;
  pipX: number; pipScale: number; stackX: number; buildX: number; slotX: number; slotW: number; galleryMax: number; mobile: boolean;
};

export function layoutFor(mobile: boolean): Layout {
  return mobile
    ? { cols: 26, rows: 14, floorY: 12, pipX: 0, pipScale: 0.75, stackX: 11, buildX: 13, slotX: 20, slotW: 6, galleryMax: 2, mobile }
    : { cols: 36, rows: 20, floorY: 18, pipX: 3, pipScale: 1, stackX: 17, buildX: 19, slotX: 28, slotW: 8, galleryMax: 3, mobile };
}

export type FramePixel = { x: number; y: number; f: Fill; a: number; s: number; rot?: number; glow?: number };
export type Guide = { kind: "ruler" | "snap"; x1: number; y1: number; x2: number; y2: number; a: number };
export type PipFrame = { x: number; y: number; scale: number; state: MascotState; arms: Arms; look: [number, number]; rot: number; blink: boolean };
export type Frame = {
  pip: PipFrame;
  pixels: FramePixel[];
  gallery: { x: number; y: number; scale: number; cells: ObjectCell[]; a: number }[];
  guides: Guide[];
  grid: { x: number; y: number; w: number; h: number; a: number } | null;
  pulse: { x: number; y: number; w: number; h: number; t: number } | null;
  cue: { x: number; y: number; a: number } | null;
};

export type BenchEvents = {
  onPhase?: (phase: Phase, objectId: string) => void;
  onSay?: (key: SayKey) => void;
  onPlaced?: (objectId: string, cycles: number) => void;
};

type Step = { start: number; dur: number; inspect: boolean };
type Plan = {
  object: BenchObject; order: ObjectCell[]; n: number;
  loose: { x: number; y: number }[];
  misplace: { index: number; dx: number; dy: number } | null;
  steps: Step[]; buildDur: number; checkDur: number; restDur: number;
  say: { phase: Phase; at: number; key: SayKey } | null;
  reaction: Reaction;
  bx: number; by: number; ox: number; oy: number;
};
type GalleryEntry = { cells: ObjectCell[]; w: number; h: number; x: number; y: number; scale: number; fromX: number; fromY: number; bornAt: number; dyingAt: number | null };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeIn = (t: number) => t * t * t;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const PIP = 12; // sprite grid

const PLACE_DUR = 2000, REACT_DUR = 1400, POKE_DUR = 900, POKE_COOLDOWN = 8000, GALLERY_ANIM = 700;

export class Bench {
  readonly layout: Layout;
  private rnd: () => number;
  private cycle: CycleState = emptyCycle();
  private plan!: Plan;
  phase: Phase = "idea";
  private t = 0;
  private now = 0;
  private dur = 0;
  private pokeT = 0;
  private pokeLastAt = -Infinity;
  private saidThisCycle = false;
  private gallery: GalleryEntry[] = [];
  private slotPiece: { cells: ObjectCell[]; w: number; h: number } | null = null;
  pointer: { x: number; y: number } | null = null;
  private pointerAt = -Infinity;
  /** Time multiplier; QA runs the bench faster, visitors see 1. */
  speed = 1;
  history: string[] = [];
  cycles = 0;
  sayLog: SayKey[] = [];
  events: BenchEvents = {};

  constructor(layout: Layout, seed = Date.now() & 0xffff, private readonly ids: readonly string[] = layout.mobile ? SMALL_OBJECT_IDS : OBJECT_IDS) {
    this.layout = layout;
    this.rnd = mulberry(seed);
    this.startCycle();
  }

  get objectId() { return this.plan.object.id; }
  get poolSize() { return this.ids.length; }
  get pipHome() { const L = this.layout; return { x: L.pipX, y: L.floorY - 11 * L.pipScale, w: PIP * L.pipScale, h: PIP * L.pipScale }; }

  // ------------------------------------------------------------- planning
  private startCycle() {
    const L = this.layout;
    const { id, state } = nextObject(this.ids, this.cycle, this.rnd);
    this.cycle = state;
    const object = objectById(id);
    const order = buildOrder(object);
    const n = order.length;
    const bx = L.buildX, by = L.floorY - object.h;
    const ox = L.slotX + Math.floor((L.slotW - object.w) / 2), oy = L.floorY - object.h;
    // Loose pixels: exactly the ones the piece needs plus two spares that stay loose.
    const loose = this.scatter(n + 2);
    // One pixel lands a cell out, most cycles. Never the very first pixel; PiP is warmed up by then.
    const options = misplaceOptions(object, order).filter(([i]) => i > 0);
    const misplace = options.length && this.rnd() < 0.7 ? (([index, dx, dy]) => ({ index, dx, dy }))(options[Math.floor(this.rnd() * options.length)]) : null;
    const inspectAt = n > 4 && this.rnd() < 0.35 ? 1 + Math.floor(this.rnd() * (n - 2)) : -1;
    const steps = this.schedule(object, order, inspectAt);
    const buildDur = steps[steps.length - 1].start + steps[steps.length - 1].dur + 320;
    const checkDur = misplace ? 4100 : 2500;
    const restDur = 1800 + this.rnd() * 900;
    // Speech: under half the cycles, and only once per cycle.
    let say: Plan["say"] = null;
    if (this.rnd() < 0.45) {
      const r = this.rnd();
      say = misplace && r < 0.5 ? { phase: "check", at: 1750, key: "precisionInspect" }
        : r < 0.72 ? { phase: "place", at: 1600, key: "precisionComplete" }
        : { phase: "build", at: Math.min(buildDur * 0.4, 1500), key: "precisionBuild" };
    }
    const reactions: Reaction[] = ["nod", "dustoff", "recheck", "adjust", "look", "fold"];
    const reaction = reactions[Math.floor(this.rnd() * reactions.length)];
    this.plan = { object, order, n, loose, misplace, steps, buildDur, checkDur, restDur, say, reaction, bx, by, ox, oy };
    this.saidThisCycle = false;
    // The previous piece leaves the slot for the gallery as the new idea forms.
    if (this.slotPiece) {
      const scale = 0.5;
      const idx = this.gallery.filter((g) => !g.dyingAt).length;
      const x = L.cols - 1 - (idx + 1) * (this.slotPiece.w * scale + 1.2);
      this.gallery.push({ ...this.slotPiece, x, y: 1, scale, fromX: ox, fromY: oy, bornAt: this.now, dyingAt: null });
      const live = this.gallery.filter((g) => !g.dyingAt);
      if (live.length > L.galleryMax) live[0].dyingAt = this.now;
      this.slotPiece = null;
    }
    this.enter("idea", L.mobile ? 1200 : 1500);
  }

  private scatter(count: number) {
    const L = this.layout;
    const out: { x: number; y: number }[] = [];
    const yMax = Math.max(2, L.floorY - (L.mobile ? 8 : 9));
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 40; tries++) {
        const x = 1 + Math.floor(this.rnd() * (L.cols - 2));
        const y = 1 + Math.floor(this.rnd() * yMax);
        const inGallery = y < 4 && x > L.cols - 14;
        const near = out.some((p) => Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2);
        if (!inGallery && !near) { out.push({ x, y }); break; }
        if (tries === 39) out.push({ x, y });
      }
    }
    return out;
  }

  private schedule(o: BenchObject, order: ObjectCell[], inspectAt: number): Step[] {
    const L = this.layout;
    const n = order.length;
    const step = L.mobile ? Math.max(110, Math.min(240, 3000 / n)) : Math.max(130, Math.min(280, 4200 / n));
    const steps: Step[] = [];
    let cursor = 0;
    order.forEach((c, i) => {
      const prev = order[i - 1];
      if (o.mode === "pixel") { cursor = i === 0 ? 0 : cursor + step; }
      else if (o.mode === "row") { if (i === 0) cursor = 0; else cursor += prev.y === c.y ? step * 0.35 : step * 1.6; }
      else { if (i === 0) cursor = 0; else cursor += prev.m === c.m ? 25 : 600; }
      const inspect = i === inspectAt;
      if (inspect) cursor += 250;
      const dur = o.mode === "pixel" ? step * 0.95 : o.mode === "row" ? step * 1.1 : step * 1.7;
      steps.push({ start: cursor, dur: dur + (inspect ? 650 : 0), inspect });
    });
    return steps;
  }

  private enter(phase: Phase, dur: number) {
    this.phase = phase; this.t = 0; this.dur = dur;
    this.events.onPhase?.(phase, this.plan.object.id);
  }

  // ------------------------------------------------------------- stepping
  /** Advance by `dt` ms of wall time. A poke freezes the work for its duration. */
  update(dt: number) {
    const step = Math.min(dt, 100) * this.speed;
    this.now += step;
    if (this.pokeT > 0) { this.pokeT -= step; return; }
    this.t += step;
    const p = this.plan;
    if (p.say && p.say.phase === this.phase && !this.saidThisCycle && this.t >= p.say.at) {
      this.saidThisCycle = true; this.sayLog.push(p.say.key); this.events.onSay?.(p.say.key);
    }
    if (this.t < this.dur) return;
    const L = this.layout;
    switch (this.phase) {
      case "idea": this.enter("gather", 400 + p.n * 70 + 500); break;
      case "gather": this.enter("build", p.buildDur); break;
      case "build": this.enter("check", p.checkDur); break;
      case "check": this.enter("place", PLACE_DUR); break;
      case "place":
        this.slotPiece = { cells: p.object.cells, w: p.object.w, h: p.object.h };
        this.history.push(p.object.id); this.cycles += 1; this.events.onPlaced?.(p.object.id, this.cycles);
        this.enter("react", REACT_DUR); break;
      case "react": this.enter("rest", p.restDur * (L.mobile ? 0.8 : 1)); break;
      case "rest": this.gallery = this.gallery.filter((g) => !g.dyingAt || this.now - g.dyingAt < 600); this.startCycle(); break;
    }
  }

  setPointer(p: { x: number; y: number } | null) { this.pointer = p; if (p) this.pointerAt = this.now; }

  /** A tap on PiP: he loses the thread for under a second, catches a pixel, and carries on. Never restarts the piece. */
  poke(): boolean {
    if (this.pokeT > 0) return false;
    this.pokeT = POKE_DUR;
    if (this.now - this.pokeLastAt > POKE_COOLDOWN && this.rnd() < 0.6) { this.sayLog.push("benchPoke"); this.events.onSay?.("benchPoke"); }
    this.pokeLastAt = this.now;
    return true;
  }

  /** Progress of the piece under construction, for tests and QA: placed cells out of total. */
  progress() { if (this.phase !== "build") return this.phase === "idea" || this.phase === "gather" ? 0 : 1; return this.plan.steps.filter((s) => this.t >= s.start + s.dur).length / this.plan.n; }

  // --------------------------------------------------------------- frames
  private hand(pip: { x: number; y: number }) { const s = this.layout.pipScale; return { x: pip.x + 10.5 * s, y: pip.y + 3 * s }; }
  private stackPos(i: number) { const L = this.layout; return { x: L.stackX - (i % 3), y: L.floorY - 1 - Math.floor(i / 3) }; }
  private looseDisplaced(p: { x: number; y: number }) {
    if (!this.pointer) return p;
    const dx = p.x + 0.5 - this.pointer.x, dy = p.y + 0.5 - this.pointer.y;
    const d = Math.hypot(dx, dy);
    if (d > 3 || d < 0.01) return p;
    const k = ((3 - d) / 3) * 1.1;
    return { x: p.x + (dx / d) * k, y: p.y + (dy / d) * k };
  }
  private pieceCells(plan: Plan, atX: number, atY: number, lift = 0, glow = 0): FramePixel[] {
    return plan.object.cells.map((c) => ({ x: atX + c.x, y: atY + c.y - lift, f: c.f, a: 1, s: 1, glow }));
  }
  private objectBox(plan: Plan, phase: Phase) { const atSlot = phase === "react" || phase === "rest"; const x = atSlot ? plan.ox : plan.bx, y = atSlot ? plan.oy : plan.by; return { x, y, w: plan.object.w, h: plan.object.h }; }

  frame(): Frame {
    const L = this.layout, p = this.plan, t = this.t;
    const home = this.pipHome;
    const pip: PipFrame = { x: home.x, y: home.y, scale: L.pipScale, state: "idle", arms: "down", look: [0.4, 0.2], rot: 0, blink: false };
    const pixels: FramePixel[] = [];
    const guides: Guide[] = [];
    let grid: Frame["grid"] = null, pulse: Frame["pulse"] = null, cue: Frame["cue"] = null;
    const objCentre = { x: p.bx + p.object.w / 2, y: p.by + p.object.h / 2 };
    const lookAt = (target: { x: number; y: number }, from = pip) => {
      const cx = from.x + 6 * L.pipScale, cy = from.y + 5 * L.pipScale;
      const dx = target.x - cx, dy = target.y - cy;
      const m = Math.max(Math.abs(dx), Math.abs(dy), 6);
      return [Math.max(-1, Math.min(1, dx / m)), Math.max(-1, Math.min(1, dy / m))] as [number, number];
    };
    const walk = (fromX: number, toX: number, a: number, b: number) => {
      const k = easeInOut(clamp01((t - a) / (b - a)));
      pip.x = lerp(fromX, toX, k);
      if (k > 0 && k < 1) pip.y = home.y - 0.25 * Math.abs(Math.sin((t - a) / 90));
    };
    const slotStand = p.ox - PIP * L.pipScale - 1;

    switch (this.phase) {
      case "idea": {
        pip.state = t < 400 ? "idle" : "curious";
        pip.look = [-1 + 2 * clamp01(t / this.dur), -0.3];
        p.loose.forEach((q, i) => {
          const a = clamp01((t - 300 - i * 40) / 250);
          if (a <= 0) return;
          const d = this.looseDisplaced(q);
          pixels.push({ x: d.x, y: d.y, f: i % 5 === 0 ? "accent" : i % 3 === 0 ? "secondary" : "primary", a: 0.9 * a, s: 0.6 + 0.4 * a });
        });
        if (t > 900) cue = { x: home.x + 7 * L.pipScale, y: home.y - 1.6, a: 0.45 + 0.45 * Math.abs(Math.sin(t / 180)) };
        break;
      }
      case "gather": {
        pip.state = "guiding"; pip.arms = "point";
        let latest: { x: number; y: number } | null = null;
        p.loose.forEach((q, i) => {
          const f: Fill = i % 5 === 0 ? "accent" : i % 3 === 0 ? "secondary" : "primary";
          if (i >= p.n) { const d = this.looseDisplaced(q); pixels.push({ x: d.x, y: d.y, f, a: 0.9, s: 1 }); return; }
          const start = 400 + i * 70;
          const k = easeInOut(clamp01((t - start) / 520));
          const to = this.stackPos(i);
          const src = k === 0 ? this.looseDisplaced(q) : q;
          const x = lerp(src.x, to.x, k), y = lerp(src.y, to.y, k) - 0.8 * Math.sin(Math.PI * k);
          if (k > 0 && k < 1) latest = { x, y };
          pixels.push({ x, y, f, a: 0.9 + 0.1 * k, s: 1 });
        });
        pip.look = latest ? lookAt(latest) : lookAt(this.stackPos(0));
        break;
      }
      case "build": {
        pip.x = home.x + 0.5;
        pip.state = "idle";
        let focus: { x: number; y: number } | null = null;
        const hand = this.hand(pip);
        p.order.forEach((c, k) => {
          const st = p.steps[k];
          const j = p.n - 1 - k; // top of the heap first
          const from = this.stackPos(j);
          const mis = p.misplace && p.misplace.index === k ? p.misplace : null;
          const to = { x: p.bx + c.x + (mis?.dx ?? 0), y: p.by + c.y + (mis?.dy ?? 0) };
          const f = c.f;
          if (t < st.start) { pixels.push({ x: from.x, y: from.y, f, a: 1, s: 1 }); return; }
          const local = t - st.start;
          if (local >= st.dur) {
            const since = local - st.dur;
            pixels.push({ x: to.x, y: to.y, f, a: 1, s: 1 + 0.22 * (1 - clamp01(since / 140)) });
            return;
          }
          const pause = st.inspect ? 650 : 0;
          const travel = st.dur - pause;
          const a1 = travel * 0.35, a2 = a1 + pause, a3 = st.dur;
          let x: number, y: number, rot = 0;
          if (local < a1) { const k1 = easeOut(local / a1); x = lerp(from.x, hand.x, k1); y = lerp(from.y, hand.y, k1); pip.arms = "carry"; focus = { x, y }; }
          else if (local < a2) { x = hand.x; y = hand.y - 0.3; rot = 45 * Math.sin(Math.PI * ((local - a1) / pause)); pip.arms = "carry"; pip.state = "curious"; focus = { x, y }; }
          else {
            const k2 = easeInOut((local - a2) / (a3 - a2));
            x = lerp(hand.x, to.x, k2); y = lerp(hand.y, to.y, k2) - 1.2 * Math.sin(Math.PI * k2);
            pip.arms = k2 > 0.8 ? "tap" : "point"; if (k2 > 0.8) pip.state = "forging";
            focus = { x: to.x, y: to.y };
          }
          pixels.push({ x, y, f, a: 1, s: 1, rot });
        });
        // Spares stay loose in the sky.
        p.loose.slice(p.n).forEach((q, i) => { const d = this.looseDisplaced(q); pixels.push({ x: d.x, y: d.y, f: i ? "primary" : "accent", a: 0.9, s: 1 }); });
        pip.look = focus ? lookAt(focus) : lookAt(objCentre);
        break;
      }
      case "check": {
        const mis = p.misplace;
        walk(home.x + 0.5, home.x - 1.5, 0, 500);
        pip.state = t < 500 ? "idle" : "curious";
        pip.look = lookAt(objCentre);
        if (t > 500 && t < 1300) { const k = clamp01((t - 500) / 200) * (1 - clamp01((t - 1100) / 200)); pip.rot = -7 * k; }
        const ruler = (a: number, b: number, alpha = 1) => {
          const k = easeOut(clamp01((t - a) / (b - a)));
          const fade = clamp01((b + 700 - t) / 300);
          if (k <= 0 || fade <= 0) return;
          const y = p.by + p.object.h + 0.55, x1 = p.bx - 0.2, x2 = x1 + (p.object.w + 0.4) * k;
          guides.push({ kind: "ruler", x1, y1: y, x2, y2: y, a: alpha * fade });
          guides.push({ kind: "snap", x1: p.bx, y1: p.by - 1.5, x2: p.bx, y2: p.by + p.object.h + 1.2, a: 0.55 * k * fade });
          guides.push({ kind: "snap", x1: p.bx + p.object.w, y1: p.by - 1.5, x2: p.bx + p.object.w, y2: p.by + p.object.h + 1.2, a: 0.55 * k * fade });
        };
        ruler(900, 1500);
        p.order.forEach((c, k) => {
          const m = mis && mis.index === k ? mis : null;
          const right = { x: p.bx + c.x, y: p.by + c.y };
          if (!m) { pixels.push({ x: right.x, y: right.y, f: c.f, a: 1, s: 1 }); return; }
          const wrong = { x: right.x + m.dx, y: right.y + m.dy };
          if (t < 2100) { pixels.push({ x: wrong.x, y: wrong.y, f: c.f, a: 1, s: 1 }); return; }
          if (t < 2500) { const k1 = easeOut(clamp01((t - 2100) / 250)); pixels.push({ x: wrong.x, y: wrong.y - 0.8 * k1, f: c.f, a: 1, s: 1 }); return; }
          if (t < 2800) { const k2 = easeInOut((t - 2500) / 300); pixels.push({ x: lerp(wrong.x, right.x, k2), y: lerp(wrong.y - 0.8, right.y, k2), f: c.f, a: 1, s: 1 }); return; }
          pixels.push({ x: right.x, y: right.y, f: c.f, a: 1, s: 1 + 0.22 * (1 - clamp01((t - 2800) / 140)) });
        });
        if (mis) {
          const c = p.order[mis.index];
          const wrong = { x: p.bx + c.x + mis.dx + 0.5, y: p.by + c.y + mis.dy + 0.5 };
          if (t >= 1700 && t < 2900) { pip.look = lookAt(wrong); pip.state = t < 2100 ? "lost" : "curious"; }
          if (t >= 2100 && t < 2800) pip.arms = "point";
          if (t >= 2800 && t < 3000) { pip.arms = "tap"; pip.state = "forging"; }
          if (t >= 2900) ruler(2950, 3450, 0.8);
        }
        if (t > this.dur - 600) { pip.state = "guiding"; pip.arms = "down"; pip.rot = 0; pip.look = lookAt(objCentre); }
        // Spares linger, quietly.
        p.loose.slice(p.n).forEach((q, i) => { const d = this.looseDisplaced(q); pixels.push({ x: d.x, y: d.y, f: i ? "primary" : "accent", a: 0.9, s: 1 }); });
        break;
      }
      case "place": {
        const ga = Math.min(clamp01(t / 300), clamp01((PLACE_DUR - 100 - t) / 400));
        grid = { x: L.slotX - 0.5, y: L.floorY - 7.5, w: L.slotW + 1, h: 7.5, a: 0.7 * ga };
        guides.push({ kind: "snap", x1: p.ox, y1: p.oy - 2, x2: p.ox, y2: L.floorY + 0.4, a: 0.6 * ga });
        guides.push({ kind: "snap", x1: p.ox + p.object.w, y1: p.oy - 2, x2: p.ox + p.object.w, y2: L.floorY + 0.4, a: 0.6 * ga });
        guides.push({ kind: "snap", x1: L.slotX - 0.5, y1: L.floorY, x2: L.slotX + L.slotW + 0.5, y2: L.floorY, a: 0.6 * ga });
        const k = easeInOut(clamp01((t - 200) / 1200));
        const x = lerp(p.bx, p.ox, k);
        let y = lerp(p.by, p.oy, k);
        const lift = 1.5 * Math.sin(Math.PI * k);
        if (t >= 1400 && t < 1550) y = p.oy + 0.12 * Math.sin(Math.PI * ((t - 1400) / 150));
        const glow = t >= 1450 ? 1 - clamp01((t - 1450) / 700) : 0;
        pixels.push(...this.pieceCells(p, x, y, lift, glow));
        if (t >= 1450 && t < 2000) pulse = { x: p.ox, y: p.oy, w: p.object.w, h: p.object.h, t: (t - 1450) / 550 };
        walk(home.x - 1.5, slotStand, 200, 1400);
        pip.arms = k < 1 ? "carry" : t < 1700 ? "point" : "down";
        pip.state = t < 1450 ? "idle" : "guiding";
        pip.look = lookAt({ x: x + p.object.w / 2, y: y - lift + p.object.h / 2 });
        p.loose.slice(p.n).forEach((q, i) => { const d = this.looseDisplaced(q); pixels.push({ x: d.x, y: d.y, f: i ? "primary" : "accent", a: 0.9 * (1 - clamp01(t / 600)), s: 1 }); });
        break;
      }
      case "react": {
        pip.x = slotStand;
        const centre = { x: p.ox + p.object.w / 2, y: p.oy + p.object.h / 2 };
        pixels.push(...this.pieceCells(p, p.ox, p.oy));
        pip.look = lookAt(centre);
        switch (p.reaction) {
          case "nod": pip.state = "celebrating"; pip.rot = 6 * Math.sin((2 * Math.PI * t) / 700) * (t < 1400 ? 1 : 0); break;
          case "dustoff": pip.state = t < 900 ? "idle" : "guiding"; pip.arms = t < 900 ? (Math.floor(t / 180) % 2 ? "dustA" : "dustB") : "down"; pip.look = [0.2, 0.6]; break;
          case "recheck": {
            pip.state = t < 900 ? "curious" : "guiding";
            const k = easeOut(clamp01((t - 100) / 600)), fade = clamp01((1300 - t) / 250);
            if (k > 0 && fade > 0) guides.push({ kind: "ruler", x1: p.ox - 0.2, y1: p.oy + p.object.h + 0.55, x2: p.ox - 0.2 + (p.object.w + 0.4) * k, y2: p.oy + p.object.h + 0.55, a: 0.8 * fade });
            break;
          }
          case "adjust": {
            const top = [...p.object.cells].sort((a, b) => a.y - b.y || b.x - a.x)[0];
            const idx = pixels.findIndex((q) => q.x === p.ox + top.x && q.y === p.oy + top.y);
            const liftK = t < 500 ? easeOut(clamp01((t - 200) / 300)) : t < 700 ? 1 : 1 - easeInOut(clamp01((t - 700) / 300));
            if (idx >= 0) { pixels[idx] = { ...pixels[idx], y: pixels[idx].y - 0.35 * liftK, s: t >= 1000 ? 1 + 0.2 * (1 - clamp01((t - 1000) / 140)) : 1 }; }
            pip.state = t < 1100 ? "curious" : "guiding"; pip.arms = t > 150 && t < 1000 ? "point" : t < 1150 ? "tap" : "down";
            pip.look = lookAt({ x: p.ox + top.x + 0.5, y: p.oy + top.y });
            break;
          }
          case "look": pip.state = "guiding"; pip.look = this.pointer ? lookAt(this.pointer) : [0, 0.7]; break;
          case "fold": pip.state = "playing"; pip.arms = "fold"; break;
        }
        break;
      }
      case "rest": {
        walk(slotStand, home.x, 100, 800);
        pip.state = "idle";
        pip.look = [0.3 * Math.sin(t / 900), 0.2];
        pixels.push(...this.pieceCells(p, p.ox, p.oy));
        break;
      }
    }

    // The slot piece from the previous cycle stays until it has moved to the gallery (handled in gallery entries).
    const gallery = this.gallery.map((g) => {
      const k = easeInOut(clamp01((this.now - g.bornAt) / GALLERY_ANIM));
      const a = g.dyingAt ? 1 - clamp01((this.now - g.dyingAt) / 500) : 0.35 + 0.35 * k;
      return { x: lerp(g.fromX, g.x, k), y: lerp(g.fromY, g.y, k), scale: lerp(1, g.scale, k), cells: g.cells, a };
    });

    // Pointer: PiP notices briefly, then gets back to work; when the pointer hovers his piece he keeps an eye on it.
    if (this.pointer) {
      const box = this.objectBox(p, this.phase);
      const over = this.pointer.x >= box.x - 1 && this.pointer.x <= box.x + box.w + 1 && this.pointer.y >= box.y - 1 && this.pointer.y <= box.y + box.h + 1;
      const recent = this.now - this.pointerAt < 1200;
      const busyHands = pip.arms === "tap" || pip.arms === "carry";
      if (over && this.phase !== "idea" && this.phase !== "gather") { pip.state = "guiding"; if (!busyHands) pip.arms = "point"; pip.look = lookAt(this.pointer); }
      else if (recent && !busyHands) pip.look = lookAt(this.pointer);
    }

    // A poke: dizzy for a beat, a pixel slips from his hand, he catches it, and the plan resumes where it stopped.
    if (this.pokeT > 0) {
      const e = POKE_DUR - this.pokeT;
      pip.state = e < 550 ? "dizzy" : "curious"; pip.arms = e < 550 ? "up" : "carry"; pip.rot = e < 550 ? 6 * Math.sin(e / 60) : 0;
      const hand = this.hand(pip);
      const drop = e < 350 ? easeIn(e / 350) * 2.2 : e < 600 ? 2.2 * (1 - easeOut((e - 350) / 250)) : 0;
      pixels.push({ x: hand.x, y: hand.y - 0.6 + drop, f: "accent", a: 1, s: 1, rot: drop * 40 });
    }

    return { pip, pixels, gallery, guides, grid, pulse, cue };
  }

  /** Reduced motion: PiP beside a finished piece on its grid, plus two earlier pieces on the shelf. */
  staticFrame(blink = false): Frame {
    const L = this.layout, p = this.plan;
    const home = this.pipHome;
    const pip: PipFrame = { x: home.x, y: home.y, scale: L.pipScale, state: "guiding", arms: "down", look: [0.6, 0.1], rot: 0, blink };
    const pixels = this.pieceCells(p, p.ox, p.oy);
    const shelf = this.ids.filter((id) => id !== p.object.id).slice(0, L.galleryMax - 1).map((id, i) => {
      const o = objectById(id); const scale = 0.5;
      return { x: L.cols - 1 - (i + 1) * (o.w * scale + 1.2), y: 1, scale, cells: o.cells, a: 0.6 };
    });
    p.loose.slice(0, 3).forEach((q, i) => pixels.push({ x: q.x, y: q.y, f: i ? "primary" : "accent", a: 0.5, s: 1 }));
    return {
      pip, pixels, gallery: shelf,
      guides: [{ kind: "snap", x1: p.ox, y1: p.oy - 1.5, x2: p.ox, y2: L.floorY + 0.4, a: 0.35 }, { kind: "snap", x1: p.ox + p.object.w, y1: p.oy - 1.5, x2: p.ox + p.object.w, y2: L.floorY + 0.4, a: 0.35 }],
      grid: { x: L.slotX - 0.5, y: L.floorY - 7.5, w: L.slotW + 1, h: 7.5, a: 0.3 }, pulse: null, cue: null,
    };
  }
}
