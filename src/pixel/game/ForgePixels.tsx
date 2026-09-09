"use client";

import { useEffect, useRef } from "react";
import { mulberry } from "../behaviours";
import type { GameProps } from "./GameHost";

/**
 * "Forge the Pixels": loose pixels drift around a small board. Move the
 * pointer (or drag on touch, or use arrow keys) to attract them, and guide
 * each one onto an empty target cell of the Pixel Forge mark.
 */
const TARGET: Array<[number, number]> = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [1, 2], [2, 2], [3, 2],
  [0, 3],
  [0, 4], [4, 4],
];
type Loose = { x: number; y: number; vx: number; vy: number; slot: number; done: boolean; hot: boolean };

export function ForgePixels({ onResult, onStatus, theme, reducedMotion, burst, seed }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const host = canvas.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
    const size = Math.max(200, Math.min(360, Math.floor(host - 8)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = size / 9;
    const ox = cell * 2, oy = cell * 2;
    const slotCentre = (i: number): [number, number] => [ox + TARGET[i][0] * cell + cell / 2, oy + TARGET[i][1] * cell + cell / 2];
    const rnd = mulberry(seed);
    const loose: Loose[] = TARGET.map((_, i) => {
      const edge = Math.floor(rnd() * 4);
      const a = rnd() * size;
      const pos = edge === 0 ? [a, 10] : edge === 1 ? [size - 10, a] : edge === 2 ? [a, size - 10] : [10, a];
      return { x: pos[0], y: pos[1], vx: (rnd() - 0.5) * 1.2, vy: (rnd() - 0.5) * 1.2, slot: i, done: false, hot: false };
    });
    const filled = new Set<number>();
    const attractor = { x: -999, y: -999, active: false };
    let raf = 0; const start = performance.now(); let last = start; let finished = false;
    const limit = 45_000;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((limit - (performance.now() - start)) / 1000));
      onStatus(`${filled.size}/${TARGET.length} forged · ${left}s`);
      if (left <= 0 && !finished) { finished = true; clearInterval(timer); onResult(filled.size >= TARGET.length - 3 ? "win" : "lose", `${filled.size}/${TARGET.length} placed.`); }
    }, 500);
    onStatus(`0/${TARGET.length} forged · 45s`);

    const toLocal = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onMove = (e: PointerEvent) => { const [x, y] = toLocal(e); attractor.x = x; attractor.y = y; attractor.active = true; };
    const onLeave = () => { attractor.active = false; };
    const onKey = (e: KeyboardEvent) => {
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
      ctx.fillStyle = "rgba(244,241,234,0.04)";
      for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      TARGET.forEach((t, i) => {
        const x = ox + t[0] * cell, y = oy + t[1] * cell;
        if (filled.has(i)) { ctx.fillStyle = i === 12 ? theme.accent : theme.primary; ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4); }
        else { ctx.strokeStyle = "rgba(255,90,44,0.55)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 3.5, y + 3.5, cell - 7, cell - 7); ctx.setLineDash([]); }
      });
      for (const p of loose) {
        if (p.done) continue;
        if (attractor.active) {
          const dx = attractor.x - p.x, dy = attractor.y - p.y; const d = Math.hypot(dx, dy) || 1;
          if (d < 90) { p.vx += (dx / d) * 0.35 * dt; p.vy += (dy / d) * 0.35 * dt; p.hot = true; } else p.hot = false;
        } else p.hot = false;
        for (let i = 0; i < TARGET.length; i++) {
          if (filled.has(i)) continue;
          const [cx, cy] = slotCentre(i);
          if (Math.hypot(cx - p.x, cy - p.y) < cell * 0.45) {
            filled.add(i); p.done = true;
            const r = canvas.getBoundingClientRect(); burst(r.left + cx, r.top + cy, 8, theme.accent);
            break;
          }
        }
        if (p.done) continue;
        p.vx *= 0.94; p.vy *= 0.94;
        if (!reducedMotion) { p.vx += (rnd() - 0.5) * 0.08; p.vy += (rnd() - 0.5) * 0.08; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 6) { p.x = 6; p.vx *= -0.8; } if (p.x > size - 6) { p.x = size - 6; p.vx *= -0.8; }
        if (p.y < 6) { p.y = 6; p.vy *= -0.8; } if (p.y > size - 6) { p.y = size - 6; p.vy *= -0.8; }
        const s = cell * 0.6;
        ctx.fillStyle = p.hot ? theme.accent : theme.primary;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      if (attractor.active) {
        ctx.strokeStyle = "rgba(244,241,234,0.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(attractor.x, attractor.y, 26, 0, Math.PI * 2); ctx.stroke();
      }
      if (filled.size === TARGET.length && !finished) {
        finished = true; clearInterval(timer);
        const secs = Math.round((performance.now() - start) / 1000);
        onStatus(`${TARGET.length}/${TARGET.length} forged`);
        const r = canvas.getBoundingClientRect(); burst(r.left + size / 2, r.top + size / 2, 40, theme.accent);
        onResult("win", `Forged in ${secs}s.`);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("keydown", onKey);
    canvas.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf); clearInterval(timer);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("keydown", onKey);
    };
    // Runs once per mount; the host remounts with a fresh key per game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="pf-game__canvas" tabIndex={0} aria-label="Game board. Use arrow keys to move the attractor." role="application" />;
}
