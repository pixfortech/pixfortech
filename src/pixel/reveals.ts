import { nextRevealTarget, stateFor, stepProgress } from "./reveal-logic";
import { mulberry } from "./behaviours";
import type { RevealOptions, RevealState, RevealStyle } from "./types";

export type RevealEntry = {
  el: HTMLElement;
  opts: Required<RevealOptions>;
  state: RevealState;
  progress: number;
  target: 0 | 1;
  visible: number;
  outside: boolean;
  /** cached cell orders, rebuilt when the element size changes */
  cols: number;
  rows: number;
  orders: Float32Array | null;
  w: number;
  h: number;
};

const DEFAULTS: Required<RevealOptions> = { style: "scatter", cell: 18, duration: 760 };

/**
 * Tracks every revealable element with two IntersectionObservers:
 *  - enter: viewport inset by 8%, fine-grained thresholds
 *  - exit: viewport expanded by 30%, single threshold
 * Progress is advanced per frame by the engine so a reversal mid-animation
 * simply changes direction instead of resetting.
 */
export class RevealManager {
  private entries = new Map<Element, RevealEntry>();
  private enterIO: IntersectionObserver | null = null;
  private exitIO: IntersectionObserver | null = null;
  private supported = typeof IntersectionObserver !== "undefined";

  constructor(private readonly onState: (entry: RevealEntry) => void, private readonly wake: () => void = () => undefined) {
    if (!this.supported) return;
    this.enterIO = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          const e = this.entries.get(r.target);
          if (!e) continue;
          e.visible = r.isIntersecting ? r.intersectionRatio : 0;
          this.retarget(e);
        }
      },
      { rootMargin: "-8% 0px -8% 0px", threshold: [0, 0.05, 0.12, 0.2, 0.35, 0.5, 0.75, 1] },
    );
    this.exitIO = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          const e = this.entries.get(r.target);
          if (!e) continue;
          e.outside = !r.isIntersecting;
          this.retarget(e);
        }
      },
      { rootMargin: "30% 0px 30% 0px", threshold: [0] },
    );
  }

  register(el: HTMLElement, opts: RevealOptions): () => void {
    if (!this.supported) {
      el.setAttribute("data-reveal", "revealed");
      return () => undefined;
    }
    const entry: RevealEntry = {
      el,
      opts: { style: opts.style ?? DEFAULTS.style, cell: opts.cell ?? DEFAULTS.cell, duration: opts.duration ?? DEFAULTS.duration },
      state: "hidden", progress: 0, target: 0,
      visible: 0, outside: true, cols: 0, rows: 0, orders: null, w: 0, h: 0,
    };
    // Elements already in view at registration should not flash: start revealed.
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom > vh * 0.08 && r.top < vh * 0.92) {
      entry.state = "revealed"; entry.progress = 1; entry.target = 1; entry.outside = false;
    }
    el.setAttribute("data-reveal", entry.state);
    this.entries.set(el, entry);
    this.enterIO!.observe(el);
    this.exitIO!.observe(el);
    return () => {
      this.enterIO?.unobserve(el);
      this.exitIO?.unobserve(el);
      this.entries.delete(el);
    };
  }

  private retarget(e: RevealEntry) {
    const next = nextRevealTarget(e.state, e.visible, e.outside);
    if (next !== e.target) { e.target = next; this.wake(); }
  }

  /** Advance all in-flight entries. Returns entries that need drawing. */
  step(dt: number, out: RevealEntry[]): RevealEntry[] {
    out.length = 0;
    for (const e of this.entries.values()) {
      if ((e.target === 1 && e.progress >= 1) || (e.target === 0 && e.progress <= 0)) {
        const s = stateFor(e.progress, e.target);
        if (s !== e.state) { e.state = s; e.el.setAttribute("data-reveal", s); this.onState(e); }
        continue;
      }
      e.progress = stepProgress(e.progress, e.target, dt, e.opts.duration);
      const s = stateFor(e.progress, e.target);
      if (s !== e.state) { e.state = s; e.el.setAttribute("data-reveal", s); this.onState(e); }
      // Still travelling toward its target (including a zero-delta first frame).
      if ((e.target === 1 && e.progress < 1) || (e.target === 0 && e.progress > 0)) out.push(e);
    }
    return out;
  }

  /** Force every entry to a state (route transitions, reduced motion). */
  setAll(state: "revealed") {
    for (const e of this.entries.values()) {
      e.progress = 1; e.target = 1; e.state = state;
      e.el.setAttribute("data-reveal", state);
    }
  }

  destroy() {
    this.enterIO?.disconnect();
    this.exitIO?.disconnect();
    this.entries.clear();
  }
}

/** Per-cell dissolve order for a style. 0 = first to dissolve on assemble. */
export function buildOrders(style: RevealStyle, cols: number, rows: number, seed: number): Float32Array {
  const rnd = mulberry(seed);
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const n = rnd() * 0.18;
      switch (style) {
        case "sweep": out[i] = x / Math.max(1, cols - 1) * 0.82 + n; break;
        case "rise": out[i] = (1 - y / Math.max(1, rows - 1)) * 0.82 + n; break;
        case "grid": out[i] = ((x + y) / Math.max(1, cols + rows - 2)) * 0.82 + n; break;
        case "edge": {
          const dx = Math.min(x, cols - 1 - x) / Math.max(1, cols / 2);
          const dy = Math.min(y, rows - 1 - y) / Math.max(1, rows / 2);
          out[i] = (1 - Math.min(dx, dy)) * 0.82 + n; break;
        }
        case "scatter":
        default: out[i] = rnd();
      }
    }
  }
  return out;
}

/**
 * Draws the construction blocks for one entry. Cells whose order is above the
 * progress are still "unforged" and cover the content; a thin band just above
 * the threshold glows in the accent colour as the working edge.
 */
export function drawRevealBlocks(
  ctx: CanvasRenderingContext2D,
  e: RevealEntry,
  colours: { secondary: string; primary: string; accent: string },
  viewportW: number,
  viewportH: number,
) {
  const r = e.el.getBoundingClientRect();
  if (r.bottom < -40 || r.top > viewportH + 40 || r.right < 0 || r.left > viewportW) return;
  const cell = e.opts.cell;
  const cols = Math.max(1, Math.ceil(r.width / cell));
  const rows = Math.max(1, Math.ceil(r.height / cell));
  // Cap the block count for very tall sections by enlarging cells.
  let c = cell, cc = cols, rr = rows;
  while (cc * rr > 520) { c *= 1.5; cc = Math.max(1, Math.ceil(r.width / c)); rr = Math.max(1, Math.ceil(r.height / c)); }
  if (!e.orders || e.cols !== cc || e.rows !== rr) {
    e.cols = cc; e.rows = rr; e.orders = buildOrders(e.opts.style, cc, rr, 97 + cc * 31 + rr);
  }
  const p = e.progress;
  const leaving = e.target === 0;
  const orders = e.orders;
  const band = 0.1;
  // Roughly six in ten cells take part; the rest let the content show through,
  // so the overlay reads as a mosaic being laid rather than a wall.
  const participates = (x: number, y: number) => ((x * 7 + y * 13 + cc) % 10) < 6;
  const darker = (x: number, y: number) => ((x * 3 + y * 5) % 7) < 3;
  for (let y = 0; y < rr; y++) {
    // Skip rows entirely off-screen
    const ry = r.top + y * c;
    if (ry + c < 0 || ry > viewportH) continue;
    for (let x = 0; x < cc; x++) {
      if (!participates(x, y)) continue;
      const o = orders[y * cc + x];
      if (o <= p) continue; // forged
      const d = o - p; // distance above threshold
      const edge = d < band;
      const alpha = edge ? 0.35 + (d / band) * 0.65 : 1;
      const shrink = edge ? 0.55 + (d / band) * 0.45 : 1;
      const s = c * shrink;
      let ox = 0, oy = 0;
      if (leaving) {
        // blocks lift away as the section leaves
        const k = (1 - p) * 10;
        ox = (x / cc - 0.5) * k;
        oy = (y / rr - 0.5) * k;
      }
      ctx.globalAlpha = alpha * (darker(x, y) ? 0.75 : 1);
      ctx.fillStyle = edge ? (d < band * 0.35 ? colours.accent : colours.primary) : colours.secondary;
      ctx.fillRect(r.left + x * c + (c - s) / 2 + ox, ry + (c - s) / 2 + oy, s - 1, s - 1);
    }
  }
  ctx.globalAlpha = 1;
}
