"use client";

import { useId, useMemo } from "react";
import { cellsFor, MASCOT_GRID } from "../mascot/sprites";
import type { MascotState } from "../behaviour/store";
import { usePixel } from "../context";
import { mulberry } from "../behaviours";
import { cn } from "@/lib/utils";

/**
 * Page scenes: PiP doing something relevant to where you are, drawn as one
 * inline SVG on a 32x20 cell grid. Every scene is a different composition of
 * the same character and the page's own palette, so the universe stays one
 * universe. A few hundred rects at most; no images, no page-weight cost worth
 * mentioning. Decorative: hidden from assistive technology, captioned in text.
 */
export type SceneKind = "forge" | "work" | "services" | "process" | "technologies" | "about" | "careers" | "contact" | "insights" | "people" | "notFound";

type Block = { x: number; y: number; w?: number; h?: number; fill: "primary" | "accent" | "secondary" | "ghost" | "bone"; o?: number; className?: string };

const CAPTIONS: Record<SceneKind, string> = {
  forge: "PiP at the anvil, forging the next block of pixels.",
  work: "PiP inspecting project pixels like samples on a bench.",
  services: "PiP surrounded by the modules that make up a build.",
  process: "PiP moving pixels through five stages, left to right.",
  technologies: "PiP examining a strict lattice, one cell at a time.",
  about: "PiP standing in the studio's grid, a small part of a bigger picture.",
  careers: "PiP opening a space in the grid for someone new.",
  contact: "PiP carrying a message across the grid.",
  insights: "PiP reading lines of pixels arranged like text.",
  people: "PiP introducing the people behind the pixels.",
  notFound: "PiP surrounded by escaped pixels.",
};

const POSE: Record<SceneKind, MascotState> = {
  forge: "forging", work: "curious", services: "guiding", process: "guiding", technologies: "curious", about: "idle", careers: "celebrating", contact: "guiding", insights: "curious", people: "guiding", notFound: "lost",
};

/** Composition per scene, in scene-grid cells (32 wide, 20 tall). PiP is 12x12, placed by `pip`. */
function compose(kind: SceneKind, rnd: () => number): { pip: [number, number]; blocks: Block[] } {
  const b: Block[] = [];
  switch (kind) {
    case "forge": {
      // anvil + block being struck + sparks
      b.push({ x: 14, y: 14, w: 12, h: 3, fill: "secondary" }, { x: 16, y: 17, w: 8, h: 2, fill: "secondary", o: 0.7 });
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b.push({ x: 17 + i, y: 11 + j, fill: j === 0 ? "accent" : "primary", o: 0.95 - j * 0.15 });
      for (let i = 0; i < 9; i++) b.push({ x: 15 + Math.floor(rnd() * 12), y: 3 + Math.floor(rnd() * 8), fill: "accent", o: 0.35 + rnd() * 0.5, className: "pf-scene__spark" });
      return { pip: [2, 6], blocks: b };
    }
    case "work": {
      // three sample swatches on a bench, each a different mini palette
      b.push({ x: 13, y: 15, w: 18, h: 1, fill: "secondary" });
      const sw = [["primary", "accent"], ["accent", "bone"], ["secondary", "primary"]] as const;
      sw.forEach(([a, c], k) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) b.push({ x: 14 + k * 6 + i, y: 10 + j, fill: (i + j) % 3 === 0 ? c : a, o: 0.85 }); });
      b.push({ x: 20, y: 6, w: 1, h: 3, fill: "bone", o: 0.5 }); // magnifier handle
      return { pip: [1, 5], blocks: b };
    }
    case "services": {
      // modules orbiting: six blocks in an arc
      const mods = [[15, 3], [21, 4], [26, 8], [26, 14], [21, 17], [15, 17]];
      mods.forEach(([x, y], i) => { for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 2; dy++) b.push({ x: x + dx, y: y + dy, fill: i % 2 ? "primary" : "secondary", o: 0.9 }); b.push({ x: x + 1, y: y - 1, fill: "accent", o: 0.8 }); });
      return { pip: [4, 5], blocks: b };
    }
    case "process": {
      // five stages: pixels increasingly ordered from left to right
      for (let s = 0; s < 5; s++) {
        const order = s / 4;
        for (let i = 0; i < 6; i++) {
          const gx = 14 + s * 3 + (i % 2), gy = 12 + Math.floor(i / 2);
          const jx = (rnd() - 0.5) * 3 * (1 - order), jy = (rnd() - 0.5) * 3 * (1 - order);
          b.push({ x: gx + jx, y: gy + jy, fill: s === 4 ? "accent" : "primary", o: 0.55 + order * 0.4 });
        }
        b.push({ x: 14 + s * 3, y: 17, w: 2, h: 1, fill: "secondary", o: 0.8 });
      }
      b.push({ x: 13, y: 9, w: 15, h: 1, fill: "secondary", o: 0.35 });
      return { pip: [1, 4], blocks: b };
    }
    case "technologies": {
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) b.push({ x: 15 + i * 2, y: 3 + j * 2, fill: "secondary", o: 0.6 + ((i * 7 + j * 3) % 5) * 0.08 });
      b.push({ x: 21, y: 9, fill: "accent" }, { x: 23, y: 11, fill: "primary" }, { x: 19, y: 13, fill: "primary" });
      return { pip: [2, 5], blocks: b };
    }
    case "about": {
      // PiP as one cell of a much larger figure: a faint big grid with a few warm cells
      for (let i = 0; i < 16; i++) for (let j = 0; j < 9; j++) if ((i + j) % 2 === 0) b.push({ x: 14 + i, y: 2 + j * 2, fill: "secondary", o: 0.25 + rnd() * 0.25 });
      [[16, 4], [22, 6], [27, 10], [18, 14], [25, 16]].forEach(([x, y]) => b.push({ x, y, fill: "primary", o: 0.85 }));
      return { pip: [2, 5], blocks: b };
    }
    case "careers": {
      // a lattice with one gap, lit, waiting
      for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) { if (i === 3 && j === 2) continue; b.push({ x: 15 + i * 2, y: 5 + j * 2, fill: "secondary", o: 0.75 }); }
      b.push({ x: 21, y: 9, fill: "accent", o: 0.35, className: "pf-scene__spark" });
      b.push({ x: 20, y: 8, w: 3, h: 3, fill: "primary", o: 0.15 });
      return { pip: [2, 5], blocks: b };
    }
    case "contact": {
      // an envelope-ish block being carried toward the right, dotted path
      for (let i = 0; i < 9; i++) b.push({ x: 15 + i * 1.6, y: 12 - Math.sin(i / 8 * Math.PI) * 4, fill: "accent", o: 0.25 + i * 0.07 });
      b.push({ x: 26, y: 8, w: 5, h: 4, fill: "primary", o: 0.9 }, { x: 27, y: 9, w: 3, h: 1, fill: "bone", o: 0.9 });
      b.push({ x: 13, y: 8, w: 4, h: 3, fill: "primary", o: 0.7 }); // the one PiP holds
      return { pip: [1, 5], blocks: b };
    }
    case "insights": {
      for (let r = 0; r < 6; r++) { const len = 8 + Math.floor(rnd() * 8); for (let i = 0; i < len; i++) if (rnd() > 0.15) b.push({ x: 14 + i, y: 4 + r * 2.4, w: 1, h: 1, fill: r === 0 ? "accent" : "secondary", o: r === 0 ? 0.9 : 0.55 }); }
      return { pip: [2, 5], blocks: b };
    }
    case "people": {
      // a row of simple figures: heads and shoulders
      for (let k = 0; k < 4; k++) { const x = 15 + k * 4; b.push({ x, y: 8, w: 2, h: 2, fill: k === 1 ? "accent" : "secondary", o: 0.9 }, { x: x - 1, y: 10, w: 4, h: 3, fill: "primary", o: 0.5 + k * 0.1 }); }
      return { pip: [2, 5], blocks: b };
    }
    case "notFound": {
      for (let i = 0; i < 14; i++) b.push({ x: 13 + rnd() * 18, y: 2 + rnd() * 16, fill: i % 3 ? "primary" : "accent", o: 0.4 + rnd() * 0.5, className: "pf-scene__spark" });
      return { pip: [3, 5], blocks: b };
    }
  }
}

export function PipScene({ kind, className, seed = 3 }: { kind: SceneKind; className?: string; seed?: number }) {
  const { theme } = usePixel();
  const id = useId();
  const scene = useMemo(() => compose(kind, mulberry(seed * 31 + kind.length)), [kind, seed]);
  const cells = useMemo(() => cellsFor(POSE[kind], [0.3, 0]), [kind]);
  const fill = (k: Block["fill"]) => (k === "primary" ? theme.primary : k === "accent" ? theme.accent : k === "secondary" ? theme.secondary : k === "ghost" ? "rgba(244,241,234,0.12)" : "#f4f1ea");
  const accent = theme.mascotVariation === "cool" ? "#8b96ff" : theme.mascotVariation === "warm" ? theme.primary : theme.mascotVariation === "mono" ? "#f4f1ea" : "#ff5a2c";
  return (
    <figure className={cn("pf-scene", className)} data-testid="pip-scene" data-kind={kind}>
      <svg viewBox="0 0 32 20" width="100%" height="100%" role="img" aria-labelledby={`${id}-cap`} className="pf-scene__svg">
        <title id={`${id}-cap`}>{CAPTIONS[kind]}</title>
        {scene.blocks.map((bl, i) => (
          <rect key={i} x={bl.x + 0.06} y={bl.y + 0.06} width={(bl.w ?? 1) - 0.12} height={(bl.h ?? 1) - 0.12} rx={0.12} fill={fill(bl.fill)} opacity={bl.o ?? 1} className={bl.className} style={bl.className ? { animationDelay: `${(i % 7) * 0.35}s` } : undefined} />
        ))}
        <g transform={`translate(${scene.pip[0]} ${scene.pip[1]})`}>
          {cells.map((c) => (
            <rect key={c.id} className={`pip-c pip-c--${c.k}`} x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} rx={0.12} style={c.k === "ember" || c.k === "fx" ? { fill: accent } : undefined} />
          ))}
        </g>
      </svg>
      <figcaption className="sr-only">{CAPTIONS[kind]}</figcaption>
    </figure>
  );
}

export { MASCOT_GRID };
