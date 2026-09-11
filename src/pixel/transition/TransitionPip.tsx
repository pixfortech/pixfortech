"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { behaviour } from "../behaviour/store";
import { authCells, type AuthCell } from "../auth/emotions";
import { MASCOT_GRID } from "../mascot/sprites";
import { usePixel } from "../context";
import type { PipLine } from "../behaviour/messages";
import { cn } from "@/lib/utils";

/**
 * PiP during a route transition. Mounted (by the parent) only while a
 * navigation is in flight, and shown only when that navigation is slow
 * enough to justify it, so fast clicks never flicker a mascot:
 *   under ~400 ms — nothing; the mosaic transition carries it.
 *   400–1500 ms   — PiP appears, carrying a pixel.
 *   over 1500 ms  — PiP stays, taps a stray block, and says one short line.
 * Decorative (aria-hidden), never blocks clicks, and unmounts the instant the
 * incoming page is ready. A hard safety timeout ends the transition even if a
 * navigation callback is lost, so the screen can never stay pixelated.
 */
const SHOW_AFTER = 400;
const MESSAGE_AFTER = 1500;
const HARD_STOP = 8000;

const FILL: Record<AuthCell["k"], string> = {
  body: "#5a5a68", foot: "#3a3a46", arm: "#6b6b7a", hand: "#8a8a9a", eye: "#f4f1ea", pupil: "#101013", lid: "#5a5a68", mouth: "#16161a", brow: "#26262e", ember: "", fx: "",
};

const subscribeMotion = (cb: () => void) => { const mq = window.matchMedia("(prefers-reduced-motion: reduce)"); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); };
const readMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TransitionPip() {
  const { theme } = usePixel();
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const [phase, setPhase] = useState<"hidden" | "brief" | "long">("hidden");
  const [line, setLine] = useState<PipLine | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) return;
    const t = timers.current;
    t.push(window.setTimeout(() => setPhase("brief"), SHOW_AFTER));
    t.push(window.setTimeout(() => {
      setPhase("long");
      const picked = behaviour.takeLine("pipTransition");
      if (picked) setLine(picked);
    }, MESSAGE_AFTER));
    // Safety net: never let a lost navigation callback leave the page pixelated.
    t.push(window.setTimeout(() => behaviour.setTransitioning(false), HARD_STOP));
    return () => { t.forEach(clearTimeout); t.length = 0; };
  }, [reduced]);

  if (reduced || phase === "hidden") return null;
  const accent = theme.mascotVariation === "cool" ? "#8b96ff" : theme.mascotVariation === "mono" ? "#f4f1ea" : theme.mascotVariation === "warm" ? theme.primary : "#ff5a2c";
  const cells = authCells(phase === "long" ? "thinking" : "attentive");

  return (
    <div className={cn("pf-tpip", phase === "long" && "pf-tpip--long")} aria-hidden="true" data-testid="transition-pip">
      <div className="pf-tpip__stage">
        <svg viewBox={`0 0 ${MASCOT_GRID} ${MASCOT_GRID}`} width="100%" height="100%" className="pf-tpip__pip" aria-hidden="true">
          {cells.map((c) => (
            <rect key={c.id} className={`pf-authpip__c pf-authpip__c--${c.k}`} x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} rx={0.12} fill={c.k === "ember" ? accent : c.k === "fx" ? theme.accent : FILL[c.k]} />
          ))}
        </svg>
        <span className="pf-tpip__block" style={{ background: accent }} />
      </div>
      {line && <p className="pf-tpip__line">{line.text}</p>}
    </div>
  );
}
