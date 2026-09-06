"use client";

import { useEffect, useRef, useState } from "react";
import { behaviour } from "../behaviour/store";
import { usePixel } from "../PixelProvider";
import { mulberry } from "../behaviours";
import { cn } from "@/lib/utils";

/**
 * "Forge the Pixels": loose pixels drift around a small board. Move the
 * pointer (or drag on touch, or use arrow keys) to attract them, and guide
 * each one onto an empty target cell of the Pixel Forge mark. Ten to thirty
 * seconds, no sound, dismissible instantly.
 */

const TARGET: Array<[number, number]> = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [1, 2], [2, 2], [3, 2],
  [0, 3],
  [0, 4], [4, 4],
];

type Loose = { x: number; y: number; vx: number; vy: number; slot: number; done: boolean; hot: boolean };

export function PixelGame({ open, inline = false, onClose, onWin }: { open: boolean; inline?: boolean; onClose: () => void; onWin?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { theme, burst } = usePixel();
  const [placed, setPlaced] = useState(0);
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!open) return;
    behaviour.setGameOpen(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    // Fit the board to its container (minus the card padding) so it never widens the layout.
    const host = canvas.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
    const size = Math.max(200, Math.min(360, Math.floor(host - 40)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = size / 9; // 5-cell mark centred in a 9-cell board
    const ox = cell * 2, oy = cell * 2;
    const slotCentre = (i: number): [number, number] => [ox + TARGET[i][0] * cell + cell / 2, oy + TARGET[i][1] * cell + cell / 2];
    const rnd = mulberry(Date.now() & 0xffff);
    const loose: Loose[] = TARGET.map((_, i) => {
      const edge = Math.floor(rnd() * 4);
      const a = rnd() * size;
      const pos = edge === 0 ? [a, 10] : edge === 1 ? [size - 10, a] : edge === 2 ? [a, size - 10] : [10, a];
      return { x: pos[0], y: pos[1], vx: (rnd() - 0.5) * 1.2, vy: (rnd() - 0.5) * 1.2, slot: i, done: false, hot: false };
    });
    const filled = new Set<number>();
    const attractor = { x: -999, y: -999, active: false };
    let raf = 0; let start = performance.now(); let last = start; let finished = false;
    const timer = window.setInterval(() => setSeconds(Math.round((performance.now() - start) / 1000)), 500);

    const toLocal = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onMove = (e: PointerEvent) => { const [x, y] = toLocal(e); attractor.x = x; attractor.y = y; attractor.active = true; };
    const onLeave = () => { attractor.active = false; };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      const step = 18;
      if (!attractor.active) { attractor.x = size / 2; attractor.y = size / 2; }
      if (e.key === "ArrowLeft") { attractor.x -= step; attractor.active = true; e.preventDefault(); }
      if (e.key === "ArrowRight") { attractor.x += step; attractor.active = true; e.preventDefault(); }
      if (e.key === "ArrowUp") { attractor.y -= step; attractor.active = true; e.preventDefault(); }
      if (e.key === "ArrowDown") { attractor.y += step; attractor.active = true; e.preventDefault(); }
      attractor.x = Math.max(0, Math.min(size, attractor.x)); attractor.y = Math.max(0, Math.min(size, attractor.y));
    };

    const frame = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67); last = now;
      ctx.clearRect(0, 0, size, size);
      // board
      ctx.fillStyle = "rgba(244,241,234,0.04)";
      for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      // targets
      TARGET.forEach((t, i) => {
        const x = ox + t[0] * cell, y = oy + t[1] * cell;
        if (filled.has(i)) { ctx.fillStyle = i === 12 ? theme.accent : theme.primary; ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4); }
        else { ctx.strokeStyle = "rgba(255,90,44,0.55)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 3.5, y + 3.5, cell - 7, cell - 7); ctx.setLineDash([]); }
      });
      // loose pixels
      for (const p of loose) {
        if (p.done) continue;
        if (attractor.active) {
          const dx = attractor.x - p.x, dy = attractor.y - p.y; const d = Math.hypot(dx, dy) || 1;
          if (d < 90) { p.vx += (dx / d) * 0.35 * dt; p.vy += (dy / d) * 0.35 * dt; p.hot = true; } else p.hot = false;
        } else p.hot = false;
        // snap into any empty target when close
        for (let i = 0; i < TARGET.length; i++) {
          if (filled.has(i)) continue;
          const [cx, cy] = slotCentre(i);
          if (Math.hypot(cx - p.x, cy - p.y) < cell * 0.45) {
            filled.add(i); p.done = true; setPlaced(filled.size);
            const r = canvas.getBoundingClientRect(); burst(r.left + cx, r.top + cy, 8, theme.accent);
            break;
          }
        }
        if (p.done) continue;
        p.vx *= 0.94; p.vy *= 0.94;
        p.vx += (rnd() - 0.5) * 0.08; p.vy += (rnd() - 0.5) * 0.08;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 6) { p.x = 6; p.vx *= -0.8; } if (p.x > size - 6) { p.x = size - 6; p.vx *= -0.8; }
        if (p.y < 6) { p.y = 6; p.vy *= -0.8; } if (p.y > size - 6) { p.y = size - 6; p.vy *= -0.8; }
        const s = cell * 0.6;
        ctx.fillStyle = p.hot ? theme.accent : theme.primary;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      // attractor ring
      if (attractor.active) {
        ctx.strokeStyle = "rgba(244,241,234,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(attractor.x, attractor.y, 26, 0, Math.PI * 2); ctx.stroke();
      }
      if (filled.size === TARGET.length && !finished) {
        finished = true; setWon(true); clearInterval(timer);
        behaviour.setMascot("celebrating", 4000);
        behaviour.say("gameWin", { force: true });
        const r = canvas.getBoundingClientRect(); burst(r.left + size / 2, r.top + size / 2, 40, theme.accent);
        onWin?.();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("keydown", onKey);
    start = performance.now();
    if (!inline) closeRef.current?.focus();
    return () => {
      cancelAnimationFrame(raf); clearInterval(timer);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("keydown", onKey);
      behaviour.setGameOpen(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const body = (
    <div className={cn("pf-game", inline && "pf-game--inline")}>
      <div className="pf-game__head">
        <div>
          <p className="eyebrow">Forge the pixels</p>
          <p className="text-small text-bone-400 mt-1">Guide the loose pixels onto the mark. Pointer, touch or arrow keys.</p>
        </div>
        {!inline && (
          <button ref={closeRef} type="button" onClick={onClose} className="pf-game__close" aria-label="Close the game">×</button>
        )}
      </div>
      <canvas ref={canvasRef} className="pf-game__canvas" tabIndex={0} aria-label="Game board. Use arrow keys to move the attractor." role="application" />
      <div className="pf-game__foot" aria-live="polite">
        <span className="num">{placed}/{TARGET.length} forged</span>
        <span className="num text-bone-400">{seconds}s</span>
        {won && <span className="text-forge-300">Forged in {seconds}s.</span>}
      </div>
    </div>
  );

  if (inline) return body;
  return (
    <div className="pf-game__scrim" role="dialog" aria-modal="true" aria-labelledby="pf-game-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <h2 id="pf-game-title" className="sr-only">Forge the pixels mini game</h2>
      {body}
    </div>
  );
}
