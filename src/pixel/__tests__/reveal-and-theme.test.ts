import { describe, expect, it } from "vitest";
import { nextRevealTarget, stateFor, stepProgress } from "../reveal-logic";
import { resolveRouteTheme, routeThemes } from "../themes";
import { themeForPath } from "../theme-resolver";
import { pickQualityTier, particleBudget } from "../quality";
import { buildOrders } from "../reveals";

describe("reveal state machine", () => {
  it("assembles once meaningfully visible and holds while inside the exit margin", () => {
    expect(nextRevealTarget("hidden", 0.05, false)).toBe(0);
    expect(nextRevealTarget("hidden", 0.2, false)).toBe(1);
    expect(nextRevealTarget("revealed", 0, false)).toBe(1); // scrolled past but within margin
    expect(nextRevealTarget("revealed", 0, true)).toBe(0); // fully out: deconstruct
  });
  it("reverses smoothly mid-flight instead of resetting", () => {
    let p = 0;
    p = stepProgress(p, 1, 300, 600); expect(p).toBeCloseTo(0.5);
    p = stepProgress(p, 0, 100, 600); expect(p).toBeLessThan(0.5); expect(p).toBeGreaterThan(0);
    expect(stateFor(p, 0)).toBe("deconstructing");
    expect(stateFor(1, 1)).toBe("revealed");
    expect(stateFor(0, 0)).toBe("hidden");
  });
});

describe("theme resolution", () => {
  it("matches the longest route prefix", () => {
    expect(resolveRouteTheme("/services/shopify-development")).toBe(routeThemes["/services"]);
    expect(resolveRouteTheme("/insights")).toBe(routeThemes["/insights"]);
    expect(resolveRouteTheme("/nowhere")).toBe(routeThemes["/"]);
  });
  it("gives each sample project its own identity", () => {
    const a = themeForPath("/work/sample-shopify-storefront");
    const b = themeForPath("/work/sample-company-website");
    const c = themeForPath("/work/sample-web-application");
    expect(new Set([a.primary, b.primary, c.primary]).size).toBe(3);
    expect(new Set([a.behaviour, b.behaviour, c.behaviour]).size).toBe(3);
    expect(themeForPath("/work")).toBe(routeThemes["/work"]);
  });
});

describe("quality tiers", () => {
  it("goes static under reduced motion regardless of hardware", () => {
    expect(pickQualityTier({ reducedMotion: true, width: 1920, cores: 16, coarse: false })).toBe("static");
  });
  it("steps down on small or low-power devices", () => {
    expect(pickQualityTier({ reducedMotion: false, width: 1920, cores: 16, coarse: false })).toBe("high");
    expect(pickQualityTier({ reducedMotion: false, width: 390, cores: 8, coarse: true })).toBe("medium");
    expect(pickQualityTier({ reducedMotion: false, width: 390, cores: 4, coarse: true })).toBe("low");
    expect(particleBudget("low", 390, 844)).toBeLessThan(particleBudget("high", 1440, 900));
  });
});

describe("block orders", () => {
  it("are deterministic per seed and in range", () => {
    const a = buildOrders("sweep", 10, 4, 5), b = buildOrders("sweep", 10, 4, 5);
    expect(Array.from(a)).toEqual(Array.from(b));
    for (const v of a) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    // sweep dissolves left to right: first column lower than last on average
    const col = (o: Float32Array, x: number) => [0, 1, 2, 3].reduce((s, y) => s + o[y * 10 + x], 0) / 4;
    expect(col(a, 0)).toBeLessThan(col(a, 9));
  });
});
