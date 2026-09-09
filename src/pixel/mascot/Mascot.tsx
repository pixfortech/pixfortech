"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { behaviour, useBehaviour } from "../behaviour/store";
import { usePixel } from "../context";
import { cellsFor, MASCOT_GRID } from "./sprites";
import { gameLibrary, type GameId } from "../behaviour/messages";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";
import { PipCornerRestore } from "./PipRestore";

/**
 * PiP lives in the bottom-right corner, watches the pointer, reacts to what
 * the behaviour store decides, and occasionally says something. He never
 * covers navigation or forms: he slides away when a form is active or the
 * mobile menu is open, and can be hidden with one press. Hidden stays hidden
 * until the visitor brings him back; a small pixel marks the way.
 */
export function Mascot({ onPlay, compact }: { onPlay: (game: GameId) => void; compact?: boolean }) {
  const s = useBehaviour();
  const { burst, theme, tier } = usePixel();
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const state = s.mascot;

  const cells = useMemo(() => cellsFor(state === "idle" && hovered ? "curious" : state === "hidden" ? "idle" : state, s.look), [state, hovered, s.look]);

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
    if (!behaviour.say("poke", { force: true })) behaviour.say("idle", { force: true });
  };

  const action = s.bubble?.action;
  return (
    <>
      <PipCornerRestore />
      <div
        className={cn("pip", `pip--${state}`, hidden && "pip--hidden", compact && "pip--compact", s.scrolling && !s.bubble && "pip--peek", tier === "static" && "pip--static")}
        data-testid="mascot"
        data-state={state}
        aria-live="off"
      >
        {s.bubble && !hidden && (
          <div className="pip-bubble" role="presentation" data-testid="mascot-bubble" data-line={s.bubble.lineId}>
            <p aria-hidden="true">{s.bubble.text}</p>
            {action?.kind === "game" && (
              <div className="pip-bubble__actions">
                <button type="button" className="pip-bubble__btn pip-bubble__btn--primary" onClick={() => { behaviour.clearBubble(); onPlay(action.game); }} aria-label={`Play ${gameLibrary[action.game].name}, a short pixel game`} data-testid="game-accept">
                  {action.label}
                </button>
                <button type="button" className="pip-bubble__btn" onClick={() => { behaviour.clearBubble(); behaviour.say(`game.${action.game}.exit`, { force: true }); }} aria-label="Dismiss the game invitation">
                  {copy.games.notNow}
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
          aria-label={copy.pip.poke}
          title="PiP"
          data-testid="pip-body"
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
        <button type="button" className="pip-dismiss" onClick={() => { behaviour.say("hide", { force: true, durationMs: 1200 }); setTimeout(() => behaviour.dismiss(), 900); }} aria-label={copy.pip.hide} title="Hide PiP" data-testid="pip-hide">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </>
  );
}
