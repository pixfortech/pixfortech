import { computeHome, mulberry, type FieldContext, type HomeResult, type Particle } from "./behaviours";
import { particleBudget, pickQualityTier } from "./quality";
import { drawForgeFront, drawsFront, RevealManager, type RevealEntry } from "./reveals";
import { forgeTheme, hexToRgb, mixRgb, rgbCss } from "./themes";
import type { PixelTheme, QualityTier, RevealOptions } from "./types";

type Rgb = [number, number, number];
type Ripple = { x: number; y: number; t: number; strength: number };
type Burst = { x: number; y: number; vx: number; vy: number; life: number; colour: string; size: number };

type TransitionPhase = "idle" | "out" | "in";

/** Cell dissolve order for the route transition grid. 0 = first to cover. */
function buildOrders(style: "sweep" | "scatter" | "rise" | "grid" | "edge", cols: number, rows: number, seed: number): Float32Array {
  const rnd = mulberry(seed);
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const n = rnd() * 0.18;
      switch (style) {
        case "sweep": out[i] = (x / Math.max(1, cols - 1)) * 0.82 + n; break;
        case "rise": out[i] = (1 - y / Math.max(1, rows - 1)) * 0.82 + n; break;
        case "grid": out[i] = ((x + y) / Math.max(1, cols + rows - 2)) * 0.82 + n; break;
        case "edge": {
          const dx = Math.min(x, cols - 1 - x) / Math.max(1, cols / 2);
          const dy = Math.min(y, rows - 1 - y) / Math.max(1, rows / 2);
          out[i] = (1 - Math.min(dx, dy)) * 0.82 + n; break;
        }
        default: out[i] = rnd();
      }
    }
  }
  return out;
}

/**
 * PixelEngine
 *
 * One instance per page load. Owns:
 *  - the background field canvas (ambient particles, behind content)
 *  - the foreground overlay canvas (reveal blocks, route transitions, bursts)
 *  - pointer state with velocity
 *  - the reveal manager
 *
 * Everything is driven from a single requestAnimationFrame loop that pauses
 * when the tab is hidden. No React state is touched per frame.
 */
export class PixelEngine {
  tier: QualityTier = "high";
  private bg: HTMLCanvasElement;
  private fg: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private fctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private start = 0;
  private running = false;
  private destroyed = false;

  // Theme
  private theme: PixelTheme = forgeTheme;
  private targetTheme: PixelTheme = forgeTheme;
  private colour = { primary: hexToRgb(forgeTheme.primary), secondary: hexToRgb(forgeTheme.secondary), accent: hexToRgb(forgeTheme.accent), background: hexToRgb(forgeTheme.background) };
  private colourTarget = { ...this.colour };
  private themeListeners = new Set<(t: PixelTheme) => void>();

  // Field
  private particles: Particle[] = [];
  private active = 0;
  private ctxField: FieldContext = { w: 0, h: 0, t: 0, scroll: 0, scrollY: 0, anchors: [], cell: 28, focal: [0.5, 0.5] };
  private home: HomeResult = { hx: 0, hy: 0, dx: 0, dy: 0, spring: 0.02 };
  private fieldDirty = true;

  // Pointer
  pointer = { x: -9999, y: -9999, vx: 0, vy: 0, speed: 0, active: false, lastMove: 0, coarse: false };
  private ripples: Ripple[] = [];
  private bursts: Burst[] = [];

  // Reveals
  readonly reveals: RevealManager;
  private inflight: RevealEntry[] = [];

  // Transition
  private transition: { phase: TransitionPhase; t: number; duration: number; orders: Float32Array | null; cols: number; rows: number; from: Rgb; to: Rgb; onOut?: () => void } = { phase: "idle", t: 0, duration: 380, orders: null, cols: 0, rows: 0, from: [0, 0, 0], to: [0, 0, 0] };
  private transitionTimeout = 0;

  private frameCount = 0;
  private onVis = () => { if (document.hidden) this.pause(); else this.play(); };
  private onResize = () => this.resize();
  private onScroll = () => { this.updateScroll(); this.scheduleForge(); };
  private forgeRaf = 0;
  /** Recompute scroll-driven forge progress once per frame while scrolling. Idle = frozen. */
  private scheduleForge() {
    if (this.forgeRaf) return;
    this.forgeRaf = requestAnimationFrame(() => {
      this.forgeRaf = 0;
      this.reveals.update(this.h, this.inflight);
      this.overlayDirty = true;
      this.drawOverlay(0);
    });
  }
  private onMove = (e: PointerEvent) => this.movePointer(e);
  private onLeave = () => { this.pointer.active = false; };
  private onDown = (e: PointerEvent) => {
    if (this.tier === "static") return;
    // Taps and clicks send a ripple through the field. Ignore clicks on controls
    // so the effect never competes with the actual interaction.
    const t = e.target as HTMLElement | null;
    if (t && t.closest("button, a, input, textarea, select, label, [role=button], [role=dialog]")) return;
    this.ripples.push({ x: e.clientX, y: e.clientY, t: 0, strength: this.pointer.coarse ? 1.4 : 0.8 });
  };

  constructor(bg: HTMLCanvasElement, fg: HTMLCanvasElement) {
    this.bg = bg; this.fg = fg;
    this.bctx = bg.getContext("2d", { alpha: true })!;
    this.fctx = fg.getContext("2d", { alpha: true })!;
    this.reveals = new RevealManager(() => this.scheduleForge());
    const mm = (q: string) => window.matchMedia(q).matches;
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    this.pointer.coarse = mm("(pointer: coarse)");
    this.tier = pickQualityTier({
      reducedMotion: mm("(prefers-reduced-motion: reduce)"),
      width: window.innerWidth,
      cores: navigator.hardwareConcurrency ?? 8,
      memoryGb: nav.deviceMemory,
      coarse: this.pointer.coarse,
      saveData: nav.connection?.saveData,
    });
    // Ambient squares do not need retina density; phones render at 1x to keep paint cheap.
    this.dpr = this.tier === "high" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.resize();
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerdown", this.onDown, { passive: true });
    document.addEventListener("pointerleave", this.onLeave);
    document.addEventListener("visibilitychange", this.onVis);
    this.updateScroll();
    this.start = performance.now();
    this.play();
  }

  // ---------------------------------------------------------------- lifecycle
  play() {
    if (this.destroyed || this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }
  pause() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  destroy() {
    this.destroyed = true;
    this.pause();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerdown", this.onDown);
    document.removeEventListener("pointerleave", this.onLeave);
    document.removeEventListener("visibilitychange", this.onVis);
    this.reveals.destroy();
    clearTimeout(this.transitionTimeout);
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    for (const c of [this.bg, this.fg]) {
      c.width = Math.round(w * this.dpr); c.height = Math.round(h * this.dpr);
      c.style.width = `${w}px`; c.style.height = `${h}px`;
    }
    this.bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctxField.w = w; this.ctxField.h = h;
    this.ctxField.cell = w < 640 ? 22 : 28;
    this.seedField();
    this.transition.orders = null;
    this.fieldDirty = true;
    this.scheduleForge();
  }

  private updateScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.ctxField.scrollY = window.scrollY;
    this.ctxField.scroll = Math.min(1, window.scrollY / max);
  }

  // ------------------------------------------------------------------ theme
  setTheme(theme: PixelTheme, immediate = false) {
    this.targetTheme = theme;
    // The faint colour wash is CSS on the canvas element, not a per-frame gradient.
    const [r, g, b] = hexToRgb(theme.background);
    this.bg.style.background = `radial-gradient(ellipse at 70% 30%, rgba(${r},${g},${b},0.07), rgba(${r},${g},${b},0) 70%)`;
    this.bg.style.transition = "background 600ms ease";
    this.colourTarget = { primary: hexToRgb(theme.primary), secondary: hexToRgb(theme.secondary), accent: hexToRgb(theme.accent), background: hexToRgb(theme.background) };
    if (immediate) { this.colour = { ...this.colourTarget }; }
    const densityChanged = theme.density !== this.theme.density || theme.behaviour !== this.theme.behaviour || theme.seed !== this.theme.seed;
    this.theme = theme;
    if (densityChanged) this.retargetField();
    this.fieldDirty = true;
    for (const l of this.themeListeners) l(theme);
  }
  getTheme() { return this.theme; }
  onTheme(l: (t: PixelTheme) => void) { this.themeListeners.add(l); return () => { this.themeListeners.delete(l); }; }

  // ------------------------------------------------------------------ field
  private seedField() {
    const budget = particleBudget(this.tier, this.w, this.h);
    const rnd = mulberry(this.theme.seed * 1000 + 17);
    const max = Math.round(budget * 1.6);
    this.particles = [];
    for (let i = 0; i < max; i++) {
      const x = rnd() * this.w, y = rnd() * this.h;
      this.particles.push({ x, y, vx: 0, vy: 0, hx: x, hy: y, ox: x, oy: y, phase: rnd() * Math.PI * 2, size: 0.6 + rnd() * 0.8, tone: rnd(), heat: 0, cluster: Math.floor(rnd() * 12) });
    }
    this.ctxField.anchors = [[0.18, 0.28], [0.72, 0.22], [0.5, 0.62], [0.85, 0.75], [0.22, 0.8], [0.6, 0.4]];
    this.retargetField();
  }
  private retargetField() {
    const budget = particleBudget(this.tier, this.w, this.h);
    this.active = Math.min(this.particles.length, Math.round(budget * this.theme.density));
  }
  /** Contact page and others can point the "converge" behaviour somewhere specific. */
  setFocal(nx: number, ny: number) { this.ctxField.focal = [nx, ny]; }

  private movePointer(e: PointerEvent) {
    const now = performance.now();
    const p = this.pointer;
    const dt = Math.max(8, now - p.lastMove);
    if (p.active) {
      const vx = (e.clientX - p.x) / dt * 16, vy = (e.clientY - p.y) / dt * 16; // px per ~frame
      p.vx = p.vx * 0.6 + vx * 0.4; p.vy = p.vy * 0.6 + vy * 0.4;
    }
    p.x = e.clientX; p.y = e.clientY; p.active = true; p.lastMove = now;
    p.speed = Math.min(60, Math.hypot(p.vx, p.vy));
  }

  /** Short-lived pixels thrown from a point; used by the mascot and celebrations. */
  burst(x: number, y: number, count = 18, colour?: string) {
    if (this.tier === "static") return;
    const rnd = mulberry((x * 31 + y * 17 + performance.now()) | 0);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, s = 2 + rnd() * 5;
      this.bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 1, colour: colour ?? (rnd() > 0.5 ? rgbCss(this.colour.primary) : rgbCss(this.colour.accent)), size: 3 + rnd() * 4 });
    }
    this.play();
  }

  // ---------------------------------------------------------------- reveals
  registerReveal(el: HTMLElement, opts: RevealOptions) {
    return this.reveals.register(el, opts, this.tier === "static");
  }

  // ------------------------------------------------------------- transitions
  /**
   * Forge out the current page, run `navigate`, then forge the next one in
   * once `routeChanged()` fires on the new pathname. A safety timer
   * guarantees the overlay never sticks.
   */
  startTransition(navigate: () => void, toTheme?: PixelTheme) {
    if (this.tier === "static") { navigate(); return; }
    const tr = this.transition;
    tr.phase = "out"; tr.t = 0; tr.duration = 360;
    tr.from = this.colour.secondary; tr.to = toTheme ? hexToRgb(toTheme.secondary) : this.colour.secondary;
    tr.onOut = navigate;
    this.ensureTransitionGrid();
    clearTimeout(this.transitionTimeout);
    this.transitionTimeout = window.setTimeout(() => { if (tr.phase !== "idle") { tr.phase = "idle"; } }, 2400);
    this.play();
  }
  get transitioning() { return this.transition.phase !== "idle"; }
  private ensureTransitionGrid() {
    const tr = this.transition;
    const cell = this.w < 640 ? 34 : 44;
    const cols = Math.ceil(this.w / cell), rows = Math.ceil(this.h / cell);
    if (!tr.orders || tr.cols !== cols || tr.rows !== rows) {
      tr.cols = cols; tr.rows = rows; tr.orders = buildOrders(this.targetTheme.transitionStyle, cols, rows, 4242);
    }
  }

  // ------------------------------------------------------------------ frame
  private frame = (now: number) => {
    if (!this.running) return;
    // When nothing is happening beyond ambient drift, render every other frame.
    this.frameCount++;
    const calm = this.tier !== "static" && now - this.pointer.lastMove > 1500 && this.inflight.length === 0 &&
      this.transition.phase === "idle" && this.bursts.length === 0 && this.ripples.length === 0;
    const halfRate = this.tier === "low" || calm;
    if (halfRate && (this.frameCount & 1) === 1) { this.raf = requestAnimationFrame(this.frame); return; }
    const dt = Math.min(48, now - this.last);
    this.last = now;
    const t = (now - this.start) / 1000;
    this.ctxField.t = t;

    // colour easing
    const k = Math.min(1, dt / 520);
    for (const key of ["primary", "secondary", "accent", "background"] as const) {
      this.colour[key] = mixRgb(this.colour[key], this.colourTarget[key], k) as Rgb;
    }

    const p = this.pointer;
    if (p.active && now - p.lastMove > 120) { p.vx *= 0.85; p.vy *= 0.85; p.speed = Math.hypot(p.vx, p.vy); }

    this.stepField(dt);
    this.drawField();
    this.drawOverlay(dt);

    // Idle detection: in static tier we only need one frame after changes.
    if (this.tier === "static") {
      const busy = this.transition.phase !== "idle" || this.bursts.length > 0;
      if (!busy && !this.fieldDirty) { this.running = false; this.raf = 0; return; }
      this.fieldDirty = false;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private stepField(dt: number) {
    if (this.tier === "static") return;
    const c = this.ctxField;
    const th = this.theme;
    const p = this.pointer;
    const speed = th.speed;
    const step = Math.min(2, dt / 16.67);
    const radius = p.coarse ? 120 : 150;
    const fast = p.speed > 14;
    // slow pointer attracts gently; fast pointer scatters, harder the faster it moves
    const dir = fast ? 1 : -1;
    const forceMag = fast ? Math.min(2.2, p.speed / 14) : 0.35;
    for (let i = 0; i < this.active; i++) {
      const q = this.particles[i];
      computeHome(th.behaviour, q, c, this.home);
      const hx = this.home.hx, hy = this.home.hy;
      const spring = this.home.spring * speed;
      q.vx += (hx - q.x) * spring * step;
      q.vy += (hy - q.y) * spring * step;
      if (p.active) {
        const dx = q.x - p.x, dy = q.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / radius) * forceMag;
          q.vx += (dx / d) * f * dir * step;
          q.vy += (dy / d) * f * dir * step;
          q.heat = Math.min(1, q.heat + (fast ? 0.12 : 0.03) * step);
        }
      }
      for (let r = 0; r < this.ripples.length; r++) {
        const rp = this.ripples[r];
        const dx = q.x - rp.x, dy = q.y - rp.y;
        const d = Math.hypot(dx, dy) || 1;
        const ring = rp.t * 420; // px radius of the wavefront
        const band = Math.abs(d - ring);
        if (band < 40) {
          const f = (1 - band / 40) * rp.strength * 1.6;
          q.vx += (dx / d) * f * step; q.vy += (dy / d) * f * step;
          q.heat = Math.min(1, q.heat + 0.08);
        }
      }
      q.vx *= 0.86; q.vy *= 0.86;
      q.x += q.vx * step; q.y += q.vy * step;
      q.heat = Math.max(0, q.heat - 0.012 * step);
    }
    for (let r = this.ripples.length - 1; r >= 0; r--) {
      this.ripples[r].t += dt / 1000;
      if (this.ripples[r].t > 1.1) this.ripples.splice(r, 1);
    }
  }

  private drawField() {
    const ctx = this.bctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const th = this.theme;
    const prim = this.colour.primary, sec = this.colour.secondary, acc = this.colour.accent;

    const base = th.size;
    const count = this.tier === "static" ? Math.min(this.active, 60) : this.active;
    for (let i = 0; i < count; i++) {
      const q = this.particles[i];
      const s = base * q.size * (1 + q.heat * 0.5);
      // tone picks between secondary (graphite) and primary; heat pushes to accent
      let col: Rgb;
      if (q.heat > 0.02) col = mixRgb(q.tone > 0.72 ? prim : sec, acc, q.heat) as Rgb;
      else col = q.tone > 0.72 ? prim : q.tone > 0.5 ? mixRgb(sec, prim, 0.35) as Rgb : sec;
      const alpha = 0.35 + q.tone * 0.45 + q.heat * 0.2;
      ctx.fillStyle = rgbCss(col, Math.min(1, alpha));
      const x = this.tier === "static" ? q.hx || q.x : q.x, y = this.tier === "static" ? q.hy || q.y : q.y;
      switch (th.geometry) {
        case "dot": ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2); ctx.fill(); break;
        case "dash": ctx.fillRect(x - s * 1.4, y - s / 4, s * 2.8, s / 2); break;
        case "diamond": ctx.beginPath(); ctx.moveTo(x, y - s / 2); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y + s / 2); ctx.lineTo(x - s / 2, y); ctx.closePath(); ctx.fill(); break;
        default: ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), Math.round(s), Math.round(s));
      }
    }
  }

  private overlayDirty = false;
  private drawOverlay(dt: number) {
    const ctx = this.fctx;
    const animated = this.bursts.length > 0 || this.transition.phase !== "idle";
    const active = this.inflight.length > 0 || animated;
    if (!active && !this.overlayDirty) return;
    ctx.clearRect(0, 0, this.w, this.h);
    // Forge fronts are static between scroll frames; keep the overlay marked
    // dirty only while something time-based is running.
    this.overlayDirty = animated;
    if (!active) return;
    const colours = { secondary: rgbCss(this.colour.secondary), primary: rgbCss(this.colour.primary), accent: rgbCss(this.colour.accent), ghost: rgbCss(this.colour.secondary, 0.35) };

    // Scroll-driven forge fronts
    if (this.tier !== "static") {
      for (const e of this.inflight) if (drawsFront(e.opts.variant)) drawForgeFront(ctx, e, colours, this.w, this.h);
    }

    // Bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt / 900; b.vy += 0.12; b.x += b.vx; b.y += b.vy; b.vx *= 0.98;
      if (b.life <= 0) { this.bursts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.fillStyle = b.colour;
      const s = b.size * (0.5 + b.life * 0.5);
      ctx.fillRect(b.x - s / 2, b.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    // Route transition
    const tr = this.transition;
    if (tr.phase !== "idle" && tr.orders) {
      tr.t += dt;
      const k = Math.min(1, tr.t / tr.duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const cell = this.w / tr.cols;
      const cover = tr.phase === "out" ? eased : 1 - eased; // fraction of cells covering the page
      const col = mixRgb(tr.from, tr.to, tr.phase === "out" ? eased * 0.5 : 0.5 + eased * 0.5) as Rgb;
      const hot = rgbCss(this.colour.primary);
      const solid = rgbCss(col);
      const deep = rgbCss(mixRgb(col, [12, 12, 14], 0.55) as Rgb);
      for (let y = 0; y < tr.rows; y++) {
        for (let x = 0; x < tr.cols; x++) {
          const o = tr.orders[y * tr.cols + x];
          if (o > cover) continue;
          const d = cover - o;
          const edge = d < 0.08;
          // Cheap integer hash for tone variety without visible stripes; ~4% of cells run hot.
          const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          const tone = hsh % 25;
          ctx.globalAlpha = edge ? 0.5 + (d / 0.08) * 0.5 : 1;
          ctx.fillStyle = edge && d < 0.03 ? hot : tone < 10 ? deep : tone === 24 ? hot : solid;
          const s = edge ? cell * (0.6 + (d / 0.08) * 0.4) : cell;
          ctx.fillRect(x * cell + (cell - s) / 2, y * cell + (cell - s) / 2, s + 0.5, s + 0.5);
        }
      }
      ctx.globalAlpha = 1;
      if (k >= 1) {
        if (tr.phase === "out") {
          // Fully covered: navigate. Stay covered until completeTransition().
          const nav = tr.onOut; tr.onOut = undefined;
          tr.phase = "in"; tr.duration = 420; tr.t = -9999; // hold covered until routeChanged()
          nav?.();
          this.transitionTimeout = window.setTimeout(() => { if (tr.t < 0) tr.t = 0; }, 900);
        } else {
          tr.phase = "idle";
        }
      }
    }
  }

  /** Called by the provider when the pathname actually changed. */
  routeChanged() {
    const tr = this.transition;
    if (tr.phase === "in" && tr.t < 0) { tr.t = 0; }
    this.updateScroll();
    this.scheduleForge();
    this.fieldDirty = true;
    this.play();
  }
}
