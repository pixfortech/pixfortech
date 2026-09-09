"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry } from "../behaviours";
import type { GameProps } from "./GameHost";

/**
 * "Hot Forge": a 5x5 grid of cells that heat up at random. Tap a cell to
 * cool it. A cell that reaches full heat burns out and is lost; heat also
 * leaks into neighbours. Survive 25 seconds losing at most three cells.
 * Reduced motion: slower heating and no pulsing.
 */
const SIZE = 5;
const LIMIT_MS = 25_000;
const MAX_LOST = 3;

type Board = { heat: number[]; lost: boolean[] };

export function HotForge({ onResult, onStatus, theme, reducedMotion, burst, seed }: GameProps) {
  const rnd = useMemo(() => mulberry(seed + 41), [seed]);
  const [board, setBoard] = useState<Board>(() => ({ heat: Array(SIZE * SIZE).fill(0), lost: Array(SIZE * SIZE).fill(false) }));
  const [cursor, setCursor] = useState(0);
  const finished = useRef(false);
  const start = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const cooled = useRef(0);

  useEffect(() => {
    if (!start.current) start.current = performance.now();
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
      const elapsed = now - start.current;
      const speed = (reducedMotion ? 0.55 : 0.8) + Math.min(0.9, elapsed / 25_000);
      setBoard((b) => {
        const heat = b.heat.slice(); const lost = b.lost.slice();
        for (let k = 0; k < 2; k++) { const i = Math.floor(rnd() * heat.length); if (!lost[i]) heat[i] = Math.min(1, heat[i] + dt * speed * 0.6); }
        for (let i = 0; i < heat.length; i++) {
          if (heat[i] > 0.6) {
            const r = Math.floor(i / SIZE), c = i % SIZE;
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
              const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
              const j = rr * SIZE + cc; if (!lost[j]) heat[j] = Math.min(1, heat[j] + dt * 0.12);
            }
          }
        }
        // Burnouts happen inside the same update, so state is never patched from an effect.
        for (let i = 0; i < heat.length; i++) if (heat[i] >= 1 && !lost[i]) { lost[i] = true; heat[i] = 0; }
        return { heat, lost };
      });
      if (acc >= 0.25) {
        acc = 0;
        const left = Math.max(0, Math.ceil((LIMIT_MS - elapsed) / 1000));
        onStatus(`${cooled.current} cooled · ${left}s`);
        if (left <= 0 && !finished.current) { finished.current = true; setBoard((b) => { const n = b.lost.filter(Boolean).length; onResult("win", n === 0 ? "No losses. Flawless." : `Held it with ${n} lost.`); return b; }); return; }
      }
      if (!finished.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rnd, reducedMotion, onStatus, onResult]);

  // Losing is a consequence of the board; report it once without touching state.
  const lostCount = board.lost.filter(Boolean).length;
  useEffect(() => {
    if (!finished.current && lostCount > MAX_LOST) { finished.current = true; onResult("lose", `${lostCount} cells burnt out.`); }
  }, [lostCount, onResult]);

  const cool = (i: number) => {
    if (finished.current || board.lost[i]) return;
    if (board.heat[i] > 0.15) {
      cooled.current += 1;
      const cell = gridRef.current?.children[i] as HTMLElement | undefined;
      if (cell) { const r = cell.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 5, theme.accent); }
    }
    setBoard((b) => { const heat = b.heat.slice(); heat[i] = 0; return { ...b, heat }; });
  };
  const onKey = (e: React.KeyboardEvent) => {
    let c = cursor;
    if (e.key === "ArrowRight") c = (c + 1) % (SIZE * SIZE);
    else if (e.key === "ArrowLeft") c = (c - 1 + SIZE * SIZE) % (SIZE * SIZE);
    else if (e.key === "ArrowDown") c = (c + SIZE) % (SIZE * SIZE);
    else if (e.key === "ArrowUp") c = (c - SIZE + SIZE * SIZE) % (SIZE * SIZE);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cool(cursor); return; }
    else return;
    e.preventDefault(); setCursor(c);
  };

  return (
    <div ref={gridRef} className="pf-grid" role="grid" aria-label="Forge cells. Tap hot cells to cool them." tabIndex={0} onKeyDown={onKey} style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }} data-testid="hotforge-grid">
      {board.heat.map((h, i) => (
        <button key={i} type="button" role="gridcell" tabIndex={-1} aria-label={board.lost[i] ? `Cell ${i + 1}, burnt out` : `Cell ${i + 1}, heat ${Math.round(h * 100)} percent`} onPointerDown={() => cool(i)} disabled={board.lost[i]} className={["pf-grid__cell", cursor === i && "pf-grid__cell--cursor", board.lost[i] && "pf-grid__cell--lost", h > 0.8 && !reducedMotion && "pf-grid__cell--critical"].filter(Boolean).join(" ")} style={{ background: board.lost[i] ? "transparent" : mixHeat(theme.secondary, theme.primary, h), boxShadow: h > 0.5 ? `0 0 ${Math.round(h * 14)}px ${theme.primary}` : undefined }} data-heat={h.toFixed(2)} />
      ))}
    </div>
  );
}

function mixHeat(cold: string, hot: string, t: number): string {
  const p = (hex: string) => { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(cold), b = p(hot);
  const w = Math.max(0, (t - 0.85) / 0.15);
  const m = a.map((v, i) => v + (b[i] - v) * Math.min(1, t / 0.85)).map((v) => v + (255 - v) * w);
  return `rgb(${m[0] | 0},${m[1] | 0},${m[2] | 0})`;
}
