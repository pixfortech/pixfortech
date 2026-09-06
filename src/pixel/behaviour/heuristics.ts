/**
 * Pure heuristics for the behaviour controller. No DOM, fully testable.
 */

export type ScrollSample = { t: number; y: number };

export type OscillationConfig = {
  /** Minimum direction reversals to count as indecision. */
  minReversals: number;
  /** Window in ms over which reversals are counted. */
  windowMs: number;
  /** Minimum travelled distance in viewport heights. */
  minTravelVh: number;
  /** Maximum net progress in viewport heights for it to still count as "no progress". */
  maxNetVh: number;
  /** Ignore direction changes smaller than this fraction of a viewport. */
  minSwingVh: number;
};

export const defaultOscillation: OscillationConfig = {
  minReversals: 6,
  windowMs: 14000,
  minTravelVh: 3,
  maxNetVh: 1.2,
  minSwingVh: 0.18,
};

/**
 * Detects repeated up/down scrolling without progress.
 * Samples are (time, scrollY). Only meaningful swings count as reversals.
 */
export function detectOscillation(samples: ScrollSample[], viewportH: number, now: number, cfg: OscillationConfig = defaultOscillation): boolean {
  const recent = samples.filter((s) => now - s.t <= cfg.windowMs);
  if (recent.length < 4 || viewportH <= 0) return false;
  let reversals = 0;
  let travel = 0;
  let dir = 0;
  let swingStart = recent[0].y;
  for (let i = 1; i < recent.length; i++) {
    const dy = recent[i].y - recent[i - 1].y;
    travel += Math.abs(dy);
    const d = Math.sign(dy);
    if (d === 0) continue;
    if (dir === 0) { dir = d; swingStart = recent[i - 1].y; continue; }
    if (d !== dir) {
      // A reversal only counts if the previous swing was large enough.
      if (Math.abs(recent[i - 1].y - swingStart) >= cfg.minSwingVh * viewportH) {
        reversals++;
        swingStart = recent[i - 1].y;
      }
      dir = d;
    }
  }
  const net = Math.abs(recent[recent.length - 1].y - recent[0].y);
  return reversals >= cfg.minReversals && travel >= cfg.minTravelVh * viewportH && net <= cfg.maxNetVh * viewportH;
}

export type DwellInput = {
  msOnRoute: number;
  interacted: boolean;
  formActive: boolean;
  dialogOpen: boolean;
  shownRecently: boolean;
  thresholdMs?: number;
};

/** Should the dwell easter egg fire? */
export function shouldTriggerDwell(i: DwellInput): boolean {
  const threshold = i.thresholdMs ?? 75000;
  return i.msOnRoute >= threshold && i.interacted && !i.formActive && !i.dialogOpen && !i.shownRecently;
}

/** Cooldown bookkeeping keyed by name; pure over a map of timestamps. */
export function isCoolingDown(last: Record<string, number>, key: string, now: number, cooldownMs: number): boolean {
  const t = last[key];
  return typeof t === "number" && now - t < cooldownMs;
}

/** Deterministic pick that avoids repeating the previous index when possible. */
export function pickIndex(length: number, previous: number | undefined, rnd: () => number = Math.random): number {
  if (length <= 1) return 0;
  let i = Math.floor(rnd() * length);
  if (i === previous) i = (i + 1) % length;
  return i;
}
