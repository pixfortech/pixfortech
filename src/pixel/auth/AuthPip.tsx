"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePixel } from "../context";
import { MASCOT_GRID } from "../mascot/sprites";
import { authCells, type AuthCell } from "./emotions";
import { authPip, useAuthPip } from "./store";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

const subscribeMotion = (cb: () => void) => { const mq = window.matchMedia("(prefers-reduced-motion: reduce)"); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); };
const readMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const FILL: Record<AuthCell["k"], string> = {
  body: "#5a5a68", foot: "#3a3a46", arm: "#6b6b7a", hand: "#8a8a9a", eye: "#f4f1ea", pupil: "#101013", lid: "#5a5a68", mouth: "#16161a", brow: "#26262e", ember: "", fx: "",
};

/**
 * PiP at the forge gate: the sprite drawn large, with a face for the moment
 * (see emotions.ts) and a line when there is something worth saying. The
 * bubble is decorative for assistive technology; the forms carry their own
 * messages. Reduced motion keeps the faces and drops the movement.
 */
export function AuthPip({ className }: { className?: string }) {
  const { state, line } = useAuthPip();
  const { theme } = usePixel();
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const [frame, setFrame] = useState(0);
  const emotion = state.emotion;

  // A wave is two arm frames alternating for a few seconds.
  useEffect(() => {
    if (emotion !== "goodbye" || reduced) return;
    let n = 0;
    const t = window.setInterval(() => { n += 1; setFrame(n); if (n >= 8) clearInterval(t); }, 380);
    return () => clearInterval(t);
  }, [emotion, reduced]);

  const cells = useMemo(() => authCells(emotion, [0.5, 0.5], frame), [emotion, frame]);
  const accent = theme.mascotVariation === "cool" ? "#8b96ff" : theme.mascotVariation === "mono" ? "#f4f1ea" : theme.mascotVariation === "warm" ? theme.primary : "#ff5a2c";

  return (
    <div className={cn("pf-authpip", `pf-authpip--${emotion}`, reduced && "pf-authpip--still", className)} data-testid="auth-pip" data-emotion={emotion} data-secret={state.secret ? "true" : "false"}>
      {line && (
        <div className="pf-authpip__bubble" data-testid="auth-pip-bubble" data-line={line.id} role="presentation">
          <p aria-hidden="true">{line.text}</p>
        </div>
      )}
      <button type="button" className="pf-authpip__body" onClick={() => authPip.dispatch({ type: "poke" })} aria-label={copy.pip.gate} title="PiP" data-testid="auth-pip-body">
        <svg viewBox={`0 0 ${MASCOT_GRID} ${MASCOT_GRID}`} width="100%" height="100%" aria-hidden="true" focusable="false" className="pf-authpip__svg">
          {cells.map((c) => (
            <rect key={c.id} className={`pf-authpip__c pf-authpip__c--${c.k}`} x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} rx={0.12} fill={c.k === "ember" ? accent : c.k === "fx" ? theme.accent : FILL[c.k]} />
          ))}
        </svg>
      </button>
    </div>
  );
}
