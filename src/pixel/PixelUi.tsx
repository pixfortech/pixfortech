"use client";

import { useCallback, useEffect, useState } from "react";
import { BehaviourObserver } from "./behaviour/BehaviourObserver";
import { behaviour, useTransitioning } from "./behaviour/store";
import type { GameId } from "./behaviour/messages";
import { Mascot } from "./mascot/Mascot";
import dynamic from "next/dynamic";
const GameHost = dynamic(() => import("./game/GameHost").then((m) => m.GameHost), { ssr: false });
import { PixelCounterPill } from "./PixelCounter";
import { PipAccountSync } from "./mascot/PipAccountSync";
import { TransitionPip } from "./transition/TransitionPip";

/** Everything playful that sits above the page: mascot, counter pill, the games. */
export function PixelUi() {
  const [game, setGame] = useState<{ id: GameId; session: number; seed: number } | null>(null);
  // A fresh key per opening remounts the game with clean state.
  const openGame = useCallback((id: GameId) => setGame((g) => ({ id, session: (g?.session ?? 0) + 1, seed: Date.now() & 0xfffff })), []);
  const closeGame = useCallback(() => setGame(null), []);
  const transitioning = useTransitioning();

  // Greeting once per session, after the visitor has settled in. Returning visitors get a different line.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __pfBehaviour?: typeof behaviour }).__pfBehaviour = behaviour;
    behaviour.hydrate();
    const t = setTimeout(() => { if (!behaviour.say(behaviour.isReturningVisitor() ? "returning" : "greeting", { state: "curious", stateMs: 3000 })) behaviour.say("greeting", { state: "curious", stateMs: 3000 }); }, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <BehaviourObserver />
      {transitioning && <TransitionPip />}
      <PipAccountSync />
      <PixelCounterPill />
      <Mascot onPlay={openGame} />
      {game && <GameHost key={game.session} game={game.id} open onClose={closeGame} seed={game.seed} />}
    </>
  );
}
