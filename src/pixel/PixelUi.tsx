"use client";

import { useCallback, useEffect, useState } from "react";
import { BehaviourObserver } from "./behaviour/BehaviourObserver";
import { behaviour } from "./behaviour/store";
import { Mascot } from "./mascot/Mascot";
import { PixelGame } from "./game/PixelGame";
import { PixelCounterPill } from "./PixelCounter";

/** Everything playful that sits above the page: mascot, counter pill, game. */
export function PixelUi() {
  const [gameOpen, setGameOpen] = useState(false);
  const [session, setSession] = useState(0);
  // A fresh key per opening remounts the game with clean state.
  const openGame = useCallback(() => { setSession((n) => n + 1); setGameOpen(true); }, []);
  const closeGame = useCallback(() => { setGameOpen(false); }, []);

  // Greeting once per session, after the visitor has settled in.
  useEffect(() => {
    const t = setTimeout(() => behaviour.say("greeting", { state: "curious", stateMs: 3000 }), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <BehaviourObserver />
      <PixelCounterPill />
      <Mascot onPlay={openGame} />
      <PixelGame key={session} open={gameOpen} onClose={closeGame} />
    </>
  );
}
