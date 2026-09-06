import type { Behaviour } from "./types";

/**
 * Field behaviours. Each returns the particle's "home" target for this frame
 * and a drift vector. The engine springs particles toward home, adds drift,
 * then applies pointer forces on top. Keeping these pure keeps them testable
 * and cheap: no allocation, no DOM.
 */

export type Particle = {
  x: number; y: number; // current
  vx: number; vy: number;
  hx: number; hy: number; // home
  ox: number; oy: number; // origin (seeded random position)
  phase: number; // per-particle phase 0..2π
  size: number; // 0.6..1.4 multiplier
  tone: number; // 0..1 palette position
  heat: number; // 0..1 pointer excitation
  cluster: number; // cluster / anchor index
};

export type FieldContext = {
  w: number; h: number;
  t: number; // seconds
  scroll: number; // 0..1 page scroll progress
  scrollY: number; // px
  anchors: Array<[number, number]>; // normalized anchor points
  cell: number; // lattice spacing px
  focal: [number, number]; // normalized focal point (contact)
};

export type HomeResult = { hx: number; hy: number; dx: number; dy: number; spring: number };

const TAU = Math.PI * 2;

export function computeHome(b: Behaviour, p: Particle, c: FieldContext, out: HomeResult): HomeResult {
  const { w, h, t, cell } = c;
  switch (b) {
    case "drift": {
      // slow convection: rises, wobbles, wraps
      out.hx = p.ox + Math.sin(t * 0.25 + p.phase) * 18;
      out.hy = ((p.oy - t * 6 * (0.6 + p.size * 0.4)) % (h + 40) + h + 40) % (h + 40) - 20;
      out.dx = 0; out.dy = 0; out.spring = 0.02;
      return out;
    }
    case "grid": {
      out.hx = Math.round(p.ox / cell) * cell + Math.sin(t * 0.4 + p.phase) * 2;
      out.hy = Math.round(p.oy / cell) * cell;
      out.dx = 0; out.dy = 0; out.spring = 0.035;
      return out;
    }
    case "cluster": {
      const a = c.anchors[p.cluster % c.anchors.length];
      // Small blocks: particles sit on a 3x3-ish local lattice around the anchor,
      // and the block slowly breathes.
      const local = p.phase / TAU;
      const col = (p.cluster * 7 + Math.floor(local * 9)) % 4, row = Math.floor(local * 9) % 3;
      const breathe = 1 + Math.sin(t * 0.6 + p.cluster) * 0.08;
      out.hx = a[0] * w + (col - 1.5) * cell * 0.9 * breathe;
      out.hy = a[1] * h + (row - 1) * cell * 0.9 * breathe;
      out.dx = 0; out.dy = 0; out.spring = 0.03;
      return out;
    }
    case "orbit": {
      const a = c.anchors[p.cluster % c.anchors.length];
      const r = 60 + (p.size - 0.6) * 140 + (p.cluster % 3) * 40;
      const ang = p.phase + t * (0.12 + p.size * 0.05) * (p.cluster % 2 ? 1 : -1);
      out.hx = a[0] * w + Math.cos(ang) * r;
      out.hy = a[1] * h + Math.sin(ang) * r * 0.6;
      out.dx = 0; out.dy = 0; out.spring = 0.03;
      return out;
    }
    case "order": {
      // Disorder at top of page resolves into a lattice as the visitor scrolls.
      const k = Math.min(1, Math.max(0, c.scroll * 1.4));
      const gx = Math.round(p.ox / cell) * cell, gy = Math.round(p.oy / cell) * cell;
      const nx = p.ox + Math.sin(t * 0.5 + p.phase) * 40, ny = p.oy + Math.cos(t * 0.4 + p.phase * 1.3) * 40;
      out.hx = nx + (gx - nx) * k;
      out.hy = ny + (gy - ny) * k;
      out.dx = 0; out.dy = 0; out.spring = 0.02 + k * 0.03;
      return out;
    }
    case "lattice": {
      // Strict grid; every few seconds a particle hops one cell.
      const hop = Math.floor(t * 0.5 + p.phase) % 4;
      const jx = hop === 1 ? cell : hop === 3 ? -cell : 0;
      const jy = hop === 2 ? cell : 0;
      out.hx = Math.round(p.ox / cell) * cell + jx;
      out.hy = Math.round(p.oy / cell) * cell + jy;
      out.dx = 0; out.dy = 0; out.spring = 0.08;
      return out;
    }
    case "lines": {
      // Text-like rows: particles keep a row and slide slowly like a cursor.
      const rowH = cell * 1.6;
      out.hy = Math.round(p.oy / rowH) * rowH;
      out.hx = ((p.ox + t * 8 * (0.5 + p.size * 0.5)) % (w + 60) + w + 60) % (w + 60) - 30;
      out.dx = 0; out.dy = 0; out.spring = 0.05;
      return out;
    }
    case "energetic": {
      out.hx = p.ox + Math.sin(t * 0.9 + p.phase) * 90 + Math.sin(t * 0.37 + p.phase * 2) * 40;
      out.hy = p.oy + Math.cos(t * 0.7 + p.phase * 1.7) * 70;
      out.dx = 0; out.dy = 0; out.spring = 0.03;
      return out;
    }
    case "converge": {
      // Everything leans toward the focal point, but never arrives.
      const fx = c.focal[0] * w, fy = c.focal[1] * h;
      const k = 0.25 + 0.15 * Math.sin(t * 0.3 + p.phase);
      out.hx = p.ox + (fx - p.ox) * k;
      out.hy = p.oy + (fy - p.oy) * k;
      out.dx = 0; out.dy = 0; out.spring = 0.02;
      return out;
    }
    case "escape": {
      const cx = w / 2, cy = h / 2;
      const ang = p.phase + t * 0.05;
      const r = 80 + ((t * 25 * (0.5 + p.size)) % (Math.max(w, h) * 0.7));
      out.hx = cx + Math.cos(ang) * r;
      out.hy = cy + Math.sin(ang) * r * 0.7;
      out.dx = 0; out.dy = 0; out.spring = 0.02;
      return out;
    }
    case "minimal":
    default: {
      out.hx = Math.round(p.ox / cell) * cell;
      out.hy = Math.round(p.oy / cell) * cell;
      out.dx = 0; out.dy = 0; out.spring = 0.05;
      return out;
    }
  }
}

/** Deterministic pseudo random. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
