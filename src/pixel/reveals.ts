import { cellThreshold, forgeBand, forgeProgress, forgeState, type ForgeState } from "./reveal-logic";
import type { RevealOptions } from "./types";

export type RevealEntry = {
  el: HTMLElement;
  opts: Required<RevealOptions>;
  progress: number;
  state: ForgeState;
  /** Near the viewport, so worth measuring on scroll. */
  candidate: boolean;
  seed: number;
};

const DEFAULTS: Required<RevealOptions> = { style: "sweep", cell: 16, duration: 0 };

/**
 * Scroll-driven reveal registry.
 *
 * An IntersectionObserver keeps a small candidate set (elements near the
 * viewport). On each scroll frame only candidates are measured; progress is
 * computed from position, written to a CSS variable and a data attribute,
 * and the engine draws the forge front for the few that are mid-way.
 * Nothing runs when the page is not scrolling.
 */
export class RevealManager {
  private entries = new Map<Element, RevealEntry>();
  private io: IntersectionObserver | null = null;
  private supported = typeof IntersectionObserver !== "undefined";
  private seedCounter = 1;

  constructor(private readonly onChange: () => void) {
    if (!this.supported) return;
    this.io = new IntersectionObserver(
      (records) => {
        let changed = false;
        for (const r of records) {
          const e = this.entries.get(r.target);
          if (!e) continue;
          e.candidate = r.isIntersecting;
          changed = true;
        }
        if (changed) this.onChange();
      },
      { rootMargin: "25% 0px 25% 0px", threshold: [0] },
    );
  }

  register(el: HTMLElement, opts: RevealOptions, reduced: boolean): () => void {
    if (!this.supported || reduced) {
      // Reduced motion or no observer support: content is simply present.
      el.setAttribute("data-forge", "forged");
      el.style.removeProperty("--forge");
      return () => undefined;
    }
    const entry: RevealEntry = {
      el, opts: { style: opts.style ?? DEFAULTS.style, cell: opts.cell ?? DEFAULTS.cell, duration: 0 },
      progress: 0, state: "unforged", candidate: false, seed: this.seedCounter++,
    };
    this.entries.set(el, entry);
    this.measure(entry, window.innerHeight, forgeBand(window.innerHeight));
    this.apply(entry);
    this.io!.observe(el);
    return () => { this.io?.unobserve(el); this.entries.delete(el); };
  }

  private measure(e: RevealEntry, vh: number, band: number) {
    const top = e.el.getBoundingClientRect().top;
    e.progress = forgeProgress(top, vh, band);
    e.state = forgeState(e.progress);
  }

  private apply(e: RevealEntry) {
    const s = e.state;
    if (e.el.dataset.forge !== s) e.el.setAttribute("data-forge", s);
    if (s === "active") e.el.style.setProperty("--forge", e.progress.toFixed(4));
    else e.el.style.removeProperty("--forge");
  }

  /** Re-measure candidates. Returns entries that are mid-forge (need drawing). */
  update(vh: number, out: RevealEntry[]): RevealEntry[] {
    out.length = 0;
    const band = forgeBand(vh);
    for (const e of this.entries.values()) {
      if (!e.candidate && e.state !== "active") continue;
      this.measure(e, vh, band);
      this.apply(e);
      if (e.state === "active") out.push(e);
    }
    return out;
  }

  /** Everything currently registered becomes forged (route change, resize to reduced). */
  setAll(state: ForgeState) {
    for (const e of this.entries.values()) {
      e.progress = state === "forged" ? 1 : 0; e.state = state; this.apply(e);
    }
  }

  destroy() {
    this.io?.disconnect();
    this.entries.clear();
  }
}

/**
 * Draws the forge front for one element: a few columns of blocks around the
 * current progress line, left of it settling, right of it still loose, plus
 * a faint dormant grid over the unforged area. Restrained by design: a
 * handful of dozen cells, never a wall.
 */
export function drawForgeFront(
  ctx: CanvasRenderingContext2D,
  e: RevealEntry,
  colours: { secondary: string; primary: string; accent: string; ghost: string },
  viewportW: number,
  viewportH: number,
) {
  const r = e.el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > viewportH || r.width < 8 || r.height < 8) return;
  const cell = e.opts.cell;
  const cols = Math.max(2, Math.ceil(r.width / cell));
  const rows = Math.max(1, Math.ceil(r.height / cell));
  const p = e.progress;
  const frontX = p * cols; // in cells
  const halfWidth = 2.2; // columns each side of the front
  const c0 = Math.max(0, Math.floor(frontX - halfWidth));
  const c1 = Math.min(cols, Math.ceil(frontX + halfWidth));
  const rowStart = Math.max(0, Math.floor(-r.top / cell));
  const rowEnd = Math.min(rows, Math.ceil((viewportH - r.top) / cell));
  if (rowEnd <= rowStart) return;

  // Dormant grid over the unforged region: one faint dot per 3x3 cells.
  ctx.fillStyle = colours.ghost;
  const gx0 = Math.max(c1, 0);
  for (let y = rowStart; y < rowEnd; y += 3) {
    for (let x = gx0 + ((y / 3) | 0) % 3; x < cols; x += 3) {
      ctx.fillRect(r.left + x * cell + cell / 2 - 1, r.top + y * cell + cell / 2 - 1, 2, 2);
    }
  }

  // The front itself.
  for (let y = rowStart; y < rowEnd; y++) {
    for (let x = c0; x < c1; x++) {
      const t = cellThreshold(x, y, cols, e.seed);
      const d = p - t; // >0 forged side, <0 loose side
      if (Math.abs(d) > halfWidth / cols) continue;
      const k = 1 - Math.abs(d) / (halfWidth / cols); // 1 at the front, 0 at the edges
      const forged = d >= 0;
      const size = forged ? cell * (0.55 + 0.45 * (1 - k)) : cell * (0.25 + 0.35 * k);
      ctx.globalAlpha = forged ? 0.35 + 0.65 * k : 0.15 + 0.55 * k;
      ctx.fillStyle = k > 0.7 ? colours.accent : forged ? colours.primary : colours.secondary;
      const cx = r.left + x * cell + cell / 2, cy = r.top + y * cell + cell / 2;
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    }
  }
  ctx.globalAlpha = 1;
}
