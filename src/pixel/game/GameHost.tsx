"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { behaviour } from "../behaviour/store";
import { gameLibrary, type GameId } from "../behaviour/messages";
import { usePixel } from "../PixelProvider";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";
import { ForgePixels } from "./ForgePixels";
import { CatchTheGlitch } from "./CatchTheGlitch";
import { RouteTheSpark } from "./RouteTheSpark";
import { PixelRecall } from "./PixelRecall";
import { HotForge } from "./HotForge";

export type GameResult = "win" | "lose";
export type GameProps = {
  /** Called once when the game ends. The host handles PiP and closing. */
  onResult: (result: GameResult, detail?: string) => void;
  /** Report progress text for the footer (score, round, time). */
  onStatus: (text: string) => void;
  theme: { primary: string; accent: string; secondary: string };
  reducedMotion: boolean;
  burst: (x: number, y: number, count?: number, colour?: string) => void;
  /** Deterministic seed chosen by the host when the game opens. */
  seed: number;
};

const mq = () => (typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)"));
const subscribeReduced = (cb: () => void) => { const m = mq(); m?.addEventListener("change", cb); return () => m?.removeEventListener("change", cb); };
const useReducedMotionFlag = () => useSyncExternalStore(subscribeReduced, () => mq()?.matches ?? false, () => false);

export const GAME_META: Record<GameId, { name: string; how: string; seconds: number }> = {
  forge: { name: gameLibrary.forge.name, how: "Guide the loose pixels onto the mark. Pointer, touch or arrow keys.", seconds: 30 },
  glitch: { name: gameLibrary.glitch.name, how: "One cell in each grid misbehaves. Tap it before the clock runs out. Arrow keys and Enter work too.", seconds: 20 },
  spark: { name: gameLibrary.spark.name, how: "Turn the tiles so the spark can travel from the left edge to the anvil on the right. Tap or press Enter on a tile to rotate it.", seconds: 45 },
  recall: { name: gameLibrary.recall.name, how: "Watch the cells light up, then tap them back in any order. Three rounds, each a little longer.", seconds: 40 },
  hotforge: { name: gameLibrary.hotforge.name, how: "Cells heat up. Tap the hottest ones before they go white. Heat spreads to neighbours if you leave it.", seconds: 25 },
};

const BODIES: Record<GameId, (p: GameProps) => ReactNode> = {
  forge: (p) => <ForgePixels {...p} />,
  glitch: (p) => <CatchTheGlitch {...p} />,
  spark: (p) => <RouteTheSpark {...p} />,
  recall: (p) => <PixelRecall {...p} />,
  hotforge: (p) => <HotForge {...p} />,
};

/**
 * Shared shell for every mini-game: consent already given (the visitor
 * pressed play), a title, one-line instructions, a close control, Escape to
 * close instantly, a live footer, and PiP's reactions on start, win, lose and
 * exit. No sound, ever. Reduced motion is passed down so games drop timers
 * and animation where they can.
 */
export function GameHost({ game, open, inline = false, onClose, onWin, seed = 7 }: { game: GameId; open: boolean; inline?: boolean; onClose: () => void; onWin?: () => void; seed?: number }) {
  const { theme, burst } = usePixel();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [detail, setDetail] = useState<string | undefined>();
  const reducedMotion = useReducedMotionFlag();
  const meta = GAME_META[game];

  useEffect(() => {
    if (!open) return;
    behaviour.setGameOpen(true);
    behaviour.gameOffered(game);
    behaviour.say(`game.${game}.start`, { force: true, durationMs: 4500 });
    if (!inline) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); closeRef.current?.click(); } };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); behaviour.setGameOpen(false); };
  }, [open, game, inline]);

  const onResult = useCallback((r: GameResult, d?: string) => {
    setResult(r); setDetail(d);
    behaviour.gamePlayed(game);
    if (r === "win") { behaviour.setMascot("celebrating", 4000); behaviour.say(`game.${game}.win`, { force: true }); onWin?.(); }
    else { behaviour.setMascot("dizzy", 2500); behaviour.say(`game.${game}.lose`, { force: true }); }
  }, [game, onWin]);

  const close = () => { if (!result) behaviour.say(`game.${game}.exit`, { force: true }); onClose(); };

  if (!open) return null;
  const body = (
    <div className={cn("pf-game", inline && "pf-game--inline")} data-testid="game" data-game={game}>
      <div className="pf-game__head">
        <div>
          <p className="eyebrow" id="pf-game-title">{meta.name}</p>
          <p className="text-small text-bone-400 mt-1">{meta.how}</p>
        </div>
        {!inline && (
          <button ref={closeRef} type="button" onClick={close} className="pf-game__close" aria-label={copy.games.close} data-testid="game-close">×</button>
        )}
      </div>
      <div className="pf-game__body">
        {BODIES[game]({ onResult, onStatus: setStatus, theme: { primary: theme.primary, accent: theme.accent, secondary: theme.secondary }, reducedMotion, burst, seed })}
      </div>
      <div className="pf-game__foot" aria-live="polite">
        <span className="num">{status}</span>
        <span className={cn("num", result === "win" ? "text-forge-300" : "text-bone-400")}>{result === "win" ? (detail ?? "Forged.") : result === "lose" ? (detail ?? "Not this time.") : copy.games.escHint}</span>
      </div>
      {result && !inline && (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="pip-bubble__btn pip-bubble__btn--primary" data-testid="game-done">Done</button>
        </div>
      )}
    </div>
  );
  if (inline) return body;
  return (
    <div className="pf-game__scrim" role="dialog" aria-modal="true" aria-labelledby="pf-game-title" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      {body}
    </div>
  );
}
