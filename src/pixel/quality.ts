import type { QualityTier } from "./types";

/** Picks a rendering tier from device hints. Pure for testability. */
export function pickQualityTier(input: { reducedMotion: boolean; width: number; cores: number; memoryGb?: number; coarse: boolean; saveData?: boolean }): QualityTier {
  if (input.reducedMotion) return "static";
  if (input.saveData) return "low";
  const lowPower = input.cores <= 4 || (input.memoryGb !== undefined && input.memoryGb <= 4);
  if (input.width < 640) return lowPower ? "low" : "medium";
  if (input.coarse || lowPower) return "medium";
  return "high";
}

/** Particle budget for a tier at a given viewport area, before theme density. */
export function particleBudget(tier: QualityTier, w: number, h: number): number {
  const area = (w * h) / (1280 * 800); // 1.0 at a laptop viewport
  const base = tier === "high" ? 320 : tier === "medium" ? 170 : tier === "low" ? 80 : 60;
  return Math.round(Math.min(base * 1.6, base * Math.max(0.45, Math.min(1.6, area))));
}
