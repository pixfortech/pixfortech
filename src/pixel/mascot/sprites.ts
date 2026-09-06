/**
 * Pip, the Pixel Forge mascot, as a 12x12 cell grid.
 *
 * A compact forged block with a chipped top-right corner (the same missing
 * corner as the monogram), where one hot ember pixel floats. Two 2x2 eyes with
 * a movable pupil, a one-row mouth, stub arms and two feet. Every expression
 * is a different arrangement of the same cells, so the silhouette stays
 * recognisable at 24px.
 */
import type { MascotState } from "../behaviour/store";

export type Cell = { id: string; x: number; y: number; k: "body" | "eye" | "pupil" | "mouth" | "arm" | "foot" | "ember" | "fx" | "lid" };

const body: Cell[] = [];
for (let y = 3; y <= 9; y++) {
  for (let x = 2; x <= 9; x++) {
    if ((x === 2 && y === 3) || (x === 9 && y === 3) || (x === 2 && y === 9) || (x === 9 && y === 9)) continue;
    if (x === 9 && y === 4) continue; // the chipped corner
    body.push({ id: `b${x}-${y}`, x, y, k: "body" });
  }
}
const feet: Cell[] = [
  { id: "f1", x: 3, y: 10, k: "foot" }, { id: "f2", x: 4, y: 10, k: "foot" },
  { id: "f3", x: 7, y: 10, k: "foot" }, { id: "f4", x: 8, y: 10, k: "foot" },
];

type Expr = {
  eyes: "open" | "half" | "closed" | "wide" | "x";
  pupil: [number, number]; // offset within the 2x2 eye: 0..1
  mouth: "neutral" | "smile" | "grin" | "frown" | "o" | "flat";
  arms: "down" | "up" | "point" | "hold" | "hammer";
  ember: "on" | "off" | "high";
  fx: "none" | "zzz" | "q" | "sparks" | "stars";
};

const EXPR: Record<MascotState, Expr> = {
  idle: { eyes: "open", pupil: [0.5, 0.5], mouth: "neutral", arms: "down", ember: "on", fx: "none" },
  curious: { eyes: "wide", pupil: [0.5, 0.5], mouth: "o", arms: "down", ember: "high", fx: "none" },
  forging: { eyes: "open", pupil: [1, 1], mouth: "flat", arms: "hammer", ember: "high", fx: "sparks" },
  guiding: { eyes: "open", pupil: [0, 0.5], mouth: "smile", arms: "point", ember: "on", fx: "none" },
  celebrating: { eyes: "closed", pupil: [0.5, 0.5], mouth: "grin", arms: "up", ember: "high", fx: "stars" },
  bored: { eyes: "half", pupil: [0.5, 1], mouth: "flat", arms: "down", ember: "off", fx: "none" },
  dizzy: { eyes: "x", pupil: [0.5, 0.5], mouth: "frown", arms: "up", ember: "off", fx: "stars" },
  playing: { eyes: "wide", pupil: [0.5, 0.5], mouth: "grin", arms: "hold", ember: "high", fx: "none" },
  lost: { eyes: "wide", pupil: [0, 0.5], mouth: "o", arms: "hold", ember: "off", fx: "q" },
  sleeping: { eyes: "closed", pupil: [0.5, 0.5], mouth: "neutral", arms: "down", ember: "off", fx: "zzz" },
  hidden: { eyes: "closed", pupil: [0.5, 0.5], mouth: "neutral", arms: "down", ember: "off", fx: "none" },
};

/** Build the cell list for a state and a look vector (-1..1). */
export function cellsFor(state: MascotState, look: [number, number]): Cell[] {
  const e = EXPR[state];
  const out: Cell[] = [...body, ...feet];

  // Eyes: 2x2 at (3,5) and (7,5)
  const eyeOrigins: Array<[number, number]> = [[3, 5], [7, 5]];
  const px = Math.max(0, Math.min(1, e.pupil[0] + look[0] * 0.5));
  const py = Math.max(0, Math.min(1, e.pupil[1] + look[1] * 0.5));
  eyeOrigins.forEach(([ex, ey], i) => {
    if (e.eyes === "closed") {
      out.push({ id: `e${i}a`, x: ex, y: ey + 1, k: "eye" }, { id: `e${i}b`, x: ex + 1, y: ey + 1, k: "eye" });
      return;
    }
    if (e.eyes === "x") {
      out.push({ id: `e${i}a`, x: ex, y: ey, k: "eye" }, { id: `e${i}b`, x: ex + 1, y: ey + 1, k: "eye" });
      out.push({ id: `e${i}c`, x: ex + 1, y: ey, k: "pupil" }, { id: `e${i}d`, x: ex, y: ey + 1, k: "pupil" });
      return;
    }
    out.push(
      { id: `e${i}a`, x: ex, y: ey, k: "eye" }, { id: `e${i}b`, x: ex + 1, y: ey, k: "eye" },
      { id: `e${i}c`, x: ex, y: ey + 1, k: "eye" }, { id: `e${i}d`, x: ex + 1, y: ey + 1, k: "eye" },
    );
    if (e.eyes === "half") out.push({ id: `l${i}`, x: ex, y: ey, k: "lid" }, { id: `l${i}b`, x: ex + 1, y: ey, k: "lid" });
    // pupil: one cell inside the 2x2, quantised by look
    out.push({ id: `p${i}`, x: ex + Math.round(px), y: ey + Math.round(py), k: "pupil" });
  });

  // Mouth row y=8
  switch (e.mouth) {
    case "neutral": out.push({ id: "m1", x: 5, y: 8, k: "mouth" }, { id: "m2", x: 6, y: 8, k: "mouth" }); break;
    case "flat": out.push({ id: "m1", x: 4, y: 8, k: "mouth" }, { id: "m2", x: 5, y: 8, k: "mouth" }, { id: "m3", x: 6, y: 8, k: "mouth" }, { id: "m4", x: 7, y: 8, k: "mouth" }); break;
    case "smile": out.push({ id: "m1", x: 4, y: 7, k: "mouth" }, { id: "m2", x: 5, y: 8, k: "mouth" }, { id: "m3", x: 6, y: 8, k: "mouth" }, { id: "m4", x: 7, y: 7, k: "mouth" }); break;
    case "grin": out.push({ id: "m1", x: 4, y: 7, k: "mouth" }, { id: "m2", x: 5, y: 8, k: "mouth" }, { id: "m3", x: 6, y: 8, k: "mouth" }, { id: "m4", x: 7, y: 7, k: "mouth" }, { id: "m5", x: 5, y: 7, k: "mouth" }, { id: "m6", x: 6, y: 7, k: "mouth" }); break;
    case "frown": out.push({ id: "m1", x: 4, y: 8, k: "mouth" }, { id: "m2", x: 5, y: 7, k: "mouth" }, { id: "m3", x: 6, y: 7, k: "mouth" }, { id: "m4", x: 7, y: 8, k: "mouth" }); break;
    case "o": out.push({ id: "m1", x: 5, y: 7, k: "mouth" }, { id: "m2", x: 6, y: 7, k: "mouth" }, { id: "m3", x: 5, y: 8, k: "mouth" }, { id: "m4", x: 6, y: 8, k: "mouth" }); break;
  }

  // Arms
  switch (e.arms) {
    case "down": out.push({ id: "aL", x: 1, y: 6, k: "arm" }, { id: "aR", x: 10, y: 6, k: "arm" }); break;
    case "up": out.push({ id: "aL", x: 1, y: 3, k: "arm" }, { id: "aR", x: 10, y: 3, k: "arm" }, { id: "aL2", x: 1, y: 4, k: "arm" }, { id: "aR2", x: 10, y: 4, k: "arm" }); break;
    case "point": out.push({ id: "aL", x: 0, y: 5, k: "arm" }, { id: "aL2", x: 1, y: 5, k: "arm" }, { id: "aR", x: 10, y: 6, k: "arm" }); break;
    case "hold": out.push({ id: "aL", x: 1, y: 5, k: "arm" }, { id: "aR", x: 10, y: 5, k: "arm" }, { id: "hL", x: 1, y: 4, k: "ember" }, { id: "hR", x: 10, y: 4, k: "ember" }); break;
    case "hammer": out.push({ id: "aL", x: 1, y: 6, k: "arm" }, { id: "aR", x: 10, y: 4, k: "arm" }, { id: "aR2", x: 11, y: 3, k: "ember" }); break;
  }

  // Ember at the chipped corner
  if (e.ember !== "off") out.push({ id: "em", x: 10, y: e.ember === "high" ? 1 : 2, k: "ember" });

  // FX
  switch (e.fx) {
    case "zzz": out.push({ id: "z1", x: 10, y: 1, k: "fx" }, { id: "z2", x: 11, y: 0, k: "fx" }); break;
    case "q": out.push({ id: "q1", x: 5, y: 0, k: "fx" }, { id: "q2", x: 6, y: 0, k: "fx" }, { id: "q3", x: 6, y: 1, k: "fx" }, { id: "q4", x: 5, y: 2, k: "fx" }); break;
    case "sparks": out.push({ id: "s1", x: 11, y: 1, k: "fx" }, { id: "s2", x: 9, y: 1, k: "fx" }); break;
    case "stars": out.push({ id: "s1", x: 0, y: 1, k: "fx" }, { id: "s2", x: 11, y: 0, k: "fx" }, { id: "s3", x: 5, y: 0, k: "fx" }); break;
  }
  return out;
}

export const MASCOT_GRID = 12;
