import type { Frame } from "./bench";
import type { Fill } from "./objects";
import { benchCells } from "./pose";

/**
 * Draws one bench frame on a 2D canvas. Scene units are grid cells; `cell`
 * is the cell size in CSS pixels. Everything is a filled square with a small
 * inset, the same material as the rest of the site, in the page theme.
 */
export type Palette = { primary: string; accent: string; secondary: string; bone: string; ember: string };
const PIP_FILL: Record<string, (p: Palette) => string> = {
  body: () => "#5a5a68", foot: () => "#3a3a46", arm: () => "#6b6b7a", eye: (p) => p.bone, pupil: () => "#101013", lid: () => "#5a5a68", mouth: () => "#16161a",
  ember: (p) => p.ember, fx: (p) => p.accent,
};

export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame, cols: number, rows: number, floorY: number, cell: number, pal: Palette) {
  const W = cols * cell, H = rows * cell;
  ctx.clearRect(0, 0, W, H);
  const fill = (f: Fill) => (f === "primary" ? pal.primary : f === "accent" ? pal.accent : f === "secondary" ? pal.secondary : pal.bone);
  const gap = Math.max(0.5, cell * 0.08);
  const square = (x: number, y: number, size: number, colour: string, alpha: number, rot = 0) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha; ctx.fillStyle = colour;
    const px = x * cell, py = y * cell, s = size * cell;
    if (rot) { ctx.save(); ctx.translate(px + s / 2, py + s / 2); ctx.rotate((rot * Math.PI) / 180); ctx.fillRect(-s / 2 + gap, -s / 2 + gap, s - 2 * gap, s - 2 * gap); ctx.restore(); }
    else ctx.fillRect(px + gap, py + gap, s - 2 * gap, s - 2 * gap);
  };

  // Bench line.
  ctx.globalAlpha = 0.14; ctx.fillStyle = pal.bone; ctx.fillRect(0, floorY * cell - 0.5, W, 1);

  // Alignment grid over the designated position.
  if (frame.grid && frame.grid.a > 0) {
    const g = frame.grid;
    ctx.globalAlpha = g.a * 0.55; ctx.fillStyle = pal.bone;
    for (let gx = Math.ceil(g.x); gx <= g.x + g.w; gx++) for (let gy = Math.ceil(g.y); gy <= g.y + g.h; gy++) ctx.fillRect(gx * cell - 1, gy * cell - 1, 2, 2);
    ctx.globalAlpha = g.a * 0.3; ctx.strokeStyle = pal.bone; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.strokeRect(g.x * cell + 0.5, g.y * cell + 0.5, g.w * cell, g.h * cell); ctx.setLineDash([]);
  }

  // Shelf of earlier pieces.
  for (const g of frame.gallery) for (const c of g.cells) square(g.x + c.x * g.scale, g.y + c.y * g.scale, g.scale, fill(c.f), g.a);

  // Guides: ruler (accent, with end ticks) and snap lines (dashed bone).
  for (const gd of frame.guides) {
    if (gd.a <= 0) continue;
    ctx.globalAlpha = gd.a; ctx.lineWidth = 1;
    if (gd.kind === "ruler") {
      ctx.strokeStyle = pal.accent; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(gd.x1 * cell, gd.y1 * cell + 0.5); ctx.lineTo(gd.x2 * cell, gd.y2 * cell + 0.5); ctx.stroke();
      const tick = cell * 0.35;
      ctx.beginPath(); ctx.moveTo(gd.x1 * cell + 0.5, gd.y1 * cell - tick); ctx.lineTo(gd.x1 * cell + 0.5, gd.y1 * cell + tick); ctx.moveTo(gd.x2 * cell - 0.5, gd.y2 * cell - tick); ctx.lineTo(gd.x2 * cell - 0.5, gd.y2 * cell + tick); ctx.stroke();
    } else {
      ctx.strokeStyle = pal.bone; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(gd.x1 * cell + 0.5, gd.y1 * cell); ctx.lineTo(gd.x2 * cell + 0.5, gd.y2 * cell); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // Pixels: loose, stacked, travelling, placed. Glow is a soft square behind the cell.
  for (const p of frame.pixels) {
    if (p.glow) square(p.x - 0.3, p.y - 0.3, 1.6, pal.accent, p.glow * 0.28);
    const s = p.s ?? 1;
    square(p.x - (s - 1) / 2, p.y - (s - 1) / 2, s, fill(p.f), p.a, p.rot);
  }

  // Confirmation pulse: an outline that grows and fades.
  if (frame.pulse) {
    const q = frame.pulse, grow = q.t * 1.1;
    ctx.globalAlpha = (1 - q.t) * 0.8; ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.5;
    ctx.strokeRect((q.x - grow) * cell, (q.y - grow) * cell, (q.w + 2 * grow) * cell, (q.h + 2 * grow) * cell);
  }

  // Thought cue: a small spark above PiP's head.
  if (frame.cue) { square(frame.cue.x, frame.cue.y, 0.6, pal.accent, frame.cue.a); square(frame.cue.x + 0.7, frame.cue.y - 0.6, 0.35, pal.accent, frame.cue.a * 0.6); }

  // PiP.
  const pip = frame.pip;
  const cs = cell * pip.scale;
  ctx.save();
  ctx.translate(pip.x * cell + 6 * cs, pip.y * cell + 6 * cs);
  if (pip.rot) ctx.rotate((pip.rot * Math.PI) / 180);
  ctx.translate(-6 * cs, -6 * cs);
  ctx.globalAlpha = 1;
  const pg = Math.max(0.4, cs * 0.06);
  for (const c of benchCells(pip.state, pip.look, pip.arms, pip.blink)) {
    ctx.fillStyle = (PIP_FILL[c.k] ?? PIP_FILL.body)(pal);
    ctx.fillRect(c.x * cs + pg, c.y * cs + pg, cs - 2 * pg, cs - 2 * pg);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
