"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry } from "../behaviours";
import type { GameProps } from "./GameHost";

/**
 * "Pixel Recall": a 4x4 grid lights a pattern for a moment, then goes dark.
 * Tap the cells back, in any order. Three rounds: 3, 4 then 5 cells. One
 * wrong tap ends the round; two wrong rounds and the game is lost.
 */
const SIZE = 4;
const ROUNDS = [3, 4, 5];

export function PixelRecall({ onResult, onStatus, theme, reducedMotion, seed }: GameProps) {
  const rnd = useMemo(() => mulberry(seed + 37), [seed]);
  const [round, setRound] = useState(0);
  const [pattern, setPattern] = useState<number[]>(() => makePattern(ROUNDS[0], rnd));
  const [phase, setPhase] = useState<"show" | "recall" | "between">("show");
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const misses = useRef(0);
  const [done, setDone] = useState(false);

  // Show phase: reveal for a beat, then hide. Reduced motion shows a little longer and never flashes.
  useEffect(() => {
    if (phase !== "show") return;
    onStatus(`Round ${round + 1}/${ROUNDS.length} · watch`);
    const t = setTimeout(() => { setPhase("recall"); onStatus(`Round ${round + 1}/${ROUNDS.length} · your turn`); }, reducedMotion ? 2200 : 1400 + round * 300);
    return () => clearTimeout(t);
  }, [phase, round, reducedMotion, onStatus]);

  const nextRound = (success: boolean) => {
    if (!success) misses.current += 1;
    if (!success && misses.current >= 2) { setDone(true); onResult("lose", `Round ${round + 1} slipped.`); return; }
    if (success && round + 1 >= ROUNDS.length) { setDone(true); onStatus("3/3 rounds"); onResult("win", misses.current ? "All rounds, one slip." : "Perfect recall."); return; }
    const r = success ? round + 1 : round;
    setPhase("between");
    setTimeout(() => { setRound(r); setPattern(makePattern(ROUNDS[r], rnd)); setPicked([]); setWrong(null); setPhase("show"); }, 700);
  };

  const pick = (i: number) => {
    if (phase !== "recall" || done || picked.includes(i)) return;
    if (!pattern.includes(i)) { setWrong(i); setTimeout(() => nextRound(false), 500); return; }
    const next = [...picked, i];
    setPicked(next);
    if (next.length === pattern.length) setTimeout(() => nextRound(true), 300);
  };
  const onKey = (e: React.KeyboardEvent) => {
    let c = cursor;
    if (e.key === "ArrowRight") c = (c + 1) % (SIZE * SIZE);
    else if (e.key === "ArrowLeft") c = (c - 1 + SIZE * SIZE) % (SIZE * SIZE);
    else if (e.key === "ArrowDown") c = (c + SIZE) % (SIZE * SIZE);
    else if (e.key === "ArrowUp") c = (c - SIZE + SIZE * SIZE) % (SIZE * SIZE);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(cursor); return; }
    else return;
    e.preventDefault(); setCursor(c);
  };

  return (
    <div className="pf-grid" role="grid" aria-label={phase === "show" ? "Memorise the lit cells." : "Tap the cells that were lit."} tabIndex={0} onKeyDown={onKey} style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }} data-testid="recall-grid" data-phase={phase}>
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const lit = phase === "show" && pattern.includes(i);
        const got = picked.includes(i);
        return (
          <button key={i} type="button" role="gridcell" tabIndex={-1} aria-label={`Cell ${i + 1}`} onClick={() => pick(i)} disabled={phase !== "recall"} className={["pf-grid__cell", cursor === i && "pf-grid__cell--cursor", wrong === i && "pf-grid__cell--miss"].filter(Boolean).join(" ")} style={{ background: lit || got ? theme.primary : theme.secondary, opacity: phase === "between" ? 0.5 : 1 }} data-lit={lit ? "true" : undefined} />
        );
      })}
    </div>
  );
}

function makePattern(n: number, rnd: () => number): number[] {
  const cells = new Set<number>();
  while (cells.size < n) cells.add(Math.floor(rnd() * SIZE * SIZE));
  return [...cells];
}
