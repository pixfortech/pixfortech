"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { behaviour, useBehaviour } from "../behaviour/store";
import { usePixel } from "../PixelProvider";
import { cellsFor, MASCOT_GRID } from "./sprites";
import { cn } from "@/lib/utils";

/**
 * Pip lives in the bottom-right corner, watches the pointer, reacts to what
 * the behaviour store decides, and occasionally says something. It never
 * covers navigation or forms: it slides away when a form is active or the
 * mobile menu is open, and can be dismissed for the session.
 */
export function Mascot({ onPlay }: { onPlay: () => void }) {
  const s = useBehaviour();
  const { burst, theme, tier } = usePixel();
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const state = s.mascot;

  const cells = useMemo(() => cellsFor(state === "idle" && hovered ? "curious" : state, s.look), [state, hovered, s.look]);

  // Celebration throws pixels from the mascot.
  useEffect(() => {
    if (state !== "celebrating" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.3, 26);
    const t = setTimeout(() => burst(r.left + r.width / 2, r.top + r.height * 0.3, 14), 500);
    return () => clearTimeout(t);
  }, [state, burst]);

  const hidden = s.dismissed || s.formActive || s.menuOpen || state === "hidden";
  const accent = theme.mascotVariation === "cool" ? "#8b96ff" : theme.mascotVariation === "warm" ? theme.primary : theme.mascotVariation === "mono" ? "#f4f1ea" : "#ff5a2c";

  const onPoke = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.4, 12);
    if (state === "sleeping") { behaviour.setMascot("curious", 2500); behaviour.say("wake", { force: true }); return; }
    behaviour.setMascot("celebrating", 1600);
    behaviour.say("idle", { force: true });
  };

  return (
    <div
      className={cn("pip", `pip--${state}`, hidden && "pip--hidden", s.scrolling && !s.bubble && "pip--peek", tier === "static" && "pip--static")}
      data-testid="mascot"
      aria-live="off"
    >
      {s.bubble && !hidden && (
        <div className="pip-bubble" role="presentation" data-testid="mascot-bubble">
          <p aria-hidden="true">{s.bubble.text}</p>
          {s.bubble.action?.kind === "game" && (
            <div className="pip-bubble__actions">
              <button type="button" className="pip-bubble__btn pip-bubble__btn--primary" onClick={() => { behaviour.clearBubble(); onPlay(); }} aria-label="Play a ten-second pixel game">
                {s.bubble.action.label}
              </button>
              <button type="button" className="pip-bubble__btn" onClick={() => { behaviour.clearBubble(); behaviour.say("gameExit"); }} aria-label="Dismiss the game invitation">
                Not now
              </button>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        ref={ref}
        className="pip-body"
        onClick={onPoke}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        aria-label="Pip, the Pixel Forge mascot. Press for a reaction."
        title="Pip"
      >
        <svg viewBox={`0 0 ${MASCOT_GRID} ${MASCOT_GRID}`} width="100%" height="100%" aria-hidden="true" focusable="false" className="pip-svg">
          {cells.map((c) => (
            <rect
              key={c.id}
              className={`pip-c pip-c--${c.k}`}
              x={c.x + 0.06}
              y={c.y + 0.06}
              width={0.88}
              height={0.88}
              rx={0.12}
              style={c.k === "ember" || c.k === "fx" ? { fill: accent } : undefined}
            />
          ))}
        </svg>
      </button>
      <button type="button" className="pip-dismiss" onClick={() => behaviour.dismiss()} aria-label="Hide Pip for this visit" title="Hide Pip">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
