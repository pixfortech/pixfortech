import type { RevealState } from "./types";

/**
 * Pure reveal state machine. Hysteresis keeps content stable while it is
 * meaningfully on screen: it assembles once a meaningful part enters the
 * viewport and only deconstructs once it has left by a margin.
 *
 * `visible` is the intersection ratio against the *enter* root (viewport
 * inset a little). `outside` is true only when the element is entirely
 * beyond the *exit* root (viewport expanded by a margin).
 */
export function nextRevealTarget(state: RevealState, visible: number, outside: boolean, enterRatio = 0.12): 1 | 0 {
  const revealed = state === "revealed" || state === "assembling";
  if (!revealed) return visible >= enterRatio ? 1 : 0;
  return outside ? 0 : 1;
}

/** Advance progress toward target with a fixed rate; reversible mid-flight. */
export function stepProgress(progress: number, target: 0 | 1, dtMs: number, durationMs: number): number {
  const rate = dtMs / Math.max(1, durationMs);
  if (target === 1) return Math.min(1, progress + rate);
  return Math.max(0, progress - rate * 1.35); // leaving is a touch quicker than arriving
}

export function stateFor(progress: number, target: 0 | 1): RevealState {
  if (progress >= 1) return "revealed";
  if (progress <= 0) return "hidden";
  return target === 1 ? "assembling" : "deconstructing";
}
