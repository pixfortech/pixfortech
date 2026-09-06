import type { PixelTheme } from "./types";

/** Core Pixel Forge identity. Every route theme is a variation of this. */
export const forgeTheme: PixelTheme = {
  primary: "#ff5a2c",
  secondary: "#3a3a44",
  accent: "#ffb08a",
  background: "#ff5a2c",
  geometry: "square",
  density: 0.6,
  behaviour: "drift",
  speed: 1,
  size: 6,
  transitionStyle: "scatter",
  mascotVariation: "forge",
  seed: 7,
};

const v = (patch: Partial<PixelTheme>): PixelTheme => ({ ...forgeTheme, ...patch });

/**
 * Page personalities. Same universe, different weather.
 * Keys are matched by longest prefix against the pathname.
 */
export const routeThemes: Record<string, PixelTheme> = {
  "/": v({ behaviour: "drift", density: 0.5, transitionStyle: "scatter" }),
  "/work": v({ behaviour: "grid", density: 0.55, speed: 0.8, transitionStyle: "grid", geometry: "square" }),
  "/services": v({ behaviour: "cluster", density: 0.6, speed: 0.9, transitionStyle: "sweep" }),
  "/about": v({ behaviour: "orbit", density: 0.45, speed: 0.6, transitionStyle: "rise", geometry: "dot" }),
  "/process": v({ behaviour: "order", density: 0.6, speed: 0.7, transitionStyle: "grid" }),
  "/technologies": v({ behaviour: "lattice", density: 0.5, speed: 0.9, transitionStyle: "grid", geometry: "square", secondary: "#2e2e38" }),
  "/insights": v({ behaviour: "lines", density: 0.45, speed: 0.5, transitionStyle: "sweep", geometry: "dash" }),
  "/careers": v({ behaviour: "energetic", density: 0.65, speed: 1.6, transitionStyle: "scatter", accent: "#ffcf9e" }),
  "/contact": v({ behaviour: "converge", density: 0.5, speed: 0.6, transitionStyle: "rise" }),
  "/privacy": v({ behaviour: "minimal", density: 0.2, speed: 0.2, transitionStyle: "sweep", geometry: "dot" }),
  "/terms": v({ behaviour: "minimal", density: 0.2, speed: 0.2, transitionStyle: "sweep", geometry: "dot" }),
  "/404": v({ behaviour: "escape", density: 0.7, speed: 1.2, transitionStyle: "scatter", accent: "#8b96ff" }),
};

/** Longest-prefix match. "/work/foo" resolves to "/work" unless overridden by a project theme. */
export function resolveRouteTheme(pathname: string): PixelTheme {
  const keys = Object.keys(routeThemes).filter((k) => k !== "/").sort((a, b) => b.length - a.length);
  for (const k of keys) if (pathname === k || pathname.startsWith(k + "/")) return routeThemes[k];
  return routeThemes["/"];
}

/** Hex to [r,g,b] 0..255. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgbCss(c: [number, number, number], alpha = 1): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}
