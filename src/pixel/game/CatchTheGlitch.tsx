"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry } from "../behaviours";
import type { GameProps } from "./GameHost";

/**
 * "Catch the Glitch": a grid of calm pixels, one of which is quietly wrong:
 * it flickers, sits a shade off, or drifts a pixel out of line. Find it and
 * tap it. Five rounds, twenty seconds, the grid grows each round. Keyboard:
 * arrows move a cursor, Enter or Space picks.
 */
const ROUNDS = 5;
const LIMIT_MS = 20_000;
type Kind = "flicker" | "shade" | "offset" | "rotate";

export function CatchTheGlitch({ onResult, onStatus, theme, reducedMotion, seed }: GameProps) {
  const rnd = useMemo(() => mulberry(seed + 11), [seed]);
  const [round, setRound] = useState(1);
  const [board, setBoard] = useState(() => makeBoard(4, rnd, reducedMotion));
  const [cursor, setCursor] = useState(0);
  const [miss, setMiss] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const start = useRef(0);
  const elapsed = useRef(0);
  const caught = useRef(0);

  useEffect(() => {
    if (!start.current) start.current = performance.now();
    const t = setInterval(() => {
      if (done) return;
      elapsed.current = performance.now() - start.current;
      const left = Math.max(0, Math.ceil((LIMIT_MS - elapsed.current) / 1000));
      onStatus(`Round ${Math.min(round, ROUNDS)}/${ROUNDS} · ${left}s`);
      if (left <= 0) { setDone(true); onResult(caught.current >= 3 ? "win" : "lose", `${caught.current}/${ROUNDS} glitches caught.`); }
    }, 250);
    return () => clearInterval(t);
  }, [round, done, onResult, onStatus]);

  const pick = (i: number) => {
    if (done) return;
    if (i !== board.glitch) { setMiss(i); setTimeout(() => setMiss(null), 350); return; }
    caught.current += 1;
    if (round >= ROUNDS) { setDone(true); const secs = Math.round(elapsed.current / 1000); onStatus(`${ROUNDS}/${ROUNDS} caught`); onResult("win", `All ${ROUNDS} in ${secs}s.`); return; }
    const size = 4 + Math.min(3, round);
    setRound(round + 1); setBoard(makeBoard(size, rnd, reducedMotion)); setCursor(0);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = board.size;
    let c = cursor;
    if (e.key === "ArrowRight") c = (c + 1) % (n * n);
    else if (e.key === "ArrowLeft") c = (c - 1 + n * n) % (n * n);
    else if (e.key === "ArrowDown") c = (c + n) % (n * n);
    else if (e.key === "ArrowUp") c = (c - n + n * n) % (n * n);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(cursor); return; }
    else return;
    e.preventDefault(); setCursor(c);
  };

  const n = board.size;
  return (
    <div className="pf-grid" role="grid" aria-label={`Glitch grid, ${n} by ${n}. One cell is different.`} tabIndex={0} onKeyDown={onKey} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} data-testid="glitch-grid">
      {Array.from({ length: n * n }, (_, i) => {
        const isGlitch = i === board.glitch;
        const style: React.CSSProperties = { background: theme.secondary };
        if (isGlitch) {
          if (board.kind === "shade") style.background = shade(theme.secondary, 0.16);
          if (board.kind === "offset") style.transform = "translate(2px, -2px)";
          if (board.kind === "rotate") style.transform = "rotate(6deg)";
        }
        return (
          <button
            key={`${round}-${i}`}
            type="button"
            role="gridcell"
            tabIndex={-1}
            aria-label={`Cell ${i + 1}`}
            onClick={() => pick(i)}
            className={["pf-grid__cell", isGlitch && board.kind === "flicker" && "pf-grid__cell--flicker", cursor === i && "pf-grid__cell--cursor", miss === i && "pf-grid__cell--miss"].filter(Boolean).join(" ")}
            style={style}
            data-glitch={isGlitch ? "true" : undefined}
          />
        );
      })}
    </div>
  );
}

function makeBoard(size: number, rnd: () => number, reducedMotion: boolean) {
  const kinds: Kind[] = reducedMotion ? ["shade", "offset", "rotate"] : ["flicker", "shade", "offset", "rotate"];
  return { size, glitch: Math.floor(rnd() * size * size), kind: kinds[Math.floor(rnd() * kinds.length)] };
}

function shade(hex: string, amount: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amount)), g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amount)), b = Math.min(255, (n & 255) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}
