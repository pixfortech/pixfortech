import { describe, expect, it } from "vitest";
import { cellThreshold, forgeBand, forgeProgress, forgeState } from "../reveal-logic";
import { resolveRouteTheme, routeThemes } from "../themes";
import { themeForPath } from "../theme-resolver";
import { pickQualityTier, particleBudget } from "../quality";

describe("scroll-driven forge progress", () => {
  const vh = 900;
  const band = forgeBand(vh);
  it("is a pure function of position: unforged below, forged after the band", () => {
    expect(forgeProgress(950, vh, band)).toBe(0);
    expect(forgeProgress(vh, vh, band)).toBe(0);
    expect(forgeProgress(vh - band, vh, band)).toBe(1);
    expect(forgeProgress(100, vh, band)).toBe(1);
  });
  it("advances with scroll and reverses to the same value at the same position", () => {
    const halfway = vh - band / 2;
    const p1 = forgeProgress(halfway, vh, band);
    expect(p1).toBeCloseTo(0.5);
    // scroll down 100px (top moves up), then back up 100px: identical state
    const down = forgeProgress(halfway - 100, vh, band);
    expect(down).toBeGreaterThan(p1);
    expect(forgeProgress(halfway - 100 + 100, vh, band)).toBeCloseTo(p1);
  });
  it("caps the band on tall viewports", () => {
    expect(forgeBand(2000)).toBe(420);
    expect(forgeBand(700)).toBe(294);
  });
  it("maps progress to states", () => {
    expect(forgeState(0)).toBe("unforged");
    expect(forgeState(0.4)).toBe("active");
    expect(forgeState(1)).toBe("forged");
  });
  it("orders cells left to right with bounded grain", () => {
    const cols = 40;
    const left = [0, 1, 2, 3].map((y) => cellThreshold(2, y, cols, 7));
    const right = [0, 1, 2, 3].map((y) => cellThreshold(37, y, cols, 7));
    expect(Math.max(...left)).toBeLessThan(Math.min(...right));
    for (const v of [...left, ...right]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    expect(cellThreshold(5, 5, cols, 7)).toBe(cellThreshold(5, 5, cols, 7));
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
