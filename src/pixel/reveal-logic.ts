/**
 * Scroll-forging maths. Pure functions so they can be unit tested.
 *
 * The forge front is the bottom edge of the viewport. An element starts
 * forging the moment its top edge enters the viewport and is fully forged
 * once its top has travelled `band` pixels up from the bottom. Progress is
 * therefore a pure function of scroll position: scrolling powers it,
 * stopping freezes it, and scrolling back reverses it.
 */

/** Height of the active forge band for a viewport. */
export function forgeBand(viewportHeight: number): number {
  return Math.round(Math.min(viewportHeight * 0.42, 420));
}

/**
 * @param top element top relative to the viewport (px)
 * @param viewportHeight
 * @param band forge band height
 * @returns 0 (unforged) .. 1 (forged)
 */
export function forgeProgress(top: number, viewportHeight: number, band: number): number {
  if (top >= viewportHeight) return 0;
  const travelled = viewportHeight - top;
  if (travelled >= band) return 1;
  return travelled / band;
}

export type ForgeState = "unforged" | "active" | "forged";

export function forgeState(progress: number): ForgeState {
  if (progress <= 0) return "unforged";
  if (progress >= 1) return "forged";
  return "active";
}

/**
 * Per-column dissolve threshold for a left-to-right front with a little
 * grain so the edge reads as assembled units rather than a straight wipe.
 * Returns the progress at which cell (x, y) becomes forged.
 */
export function cellThreshold(x: number, y: number, cols: number, seed: number): number {
  const hsh = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0;
  const noise = (hsh % 1000) / 1000; // 0..1
  const base = (x + 0.5) / cols; // column position
  return Math.min(1, Math.max(0, base + (noise - 0.5) * (2.4 / cols)));
}
