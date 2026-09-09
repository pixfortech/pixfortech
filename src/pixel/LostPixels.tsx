"use client";

import { useEffect, useState } from "react";
import { behaviour } from "./behaviour/store";
import { GameHost } from "./game/GameHost";

/**
 * 404 scene: the escaped pixels are the Forge game itself, inline. Gathering
 * them rebuilds the Pixel Forge mark, which is as close to "finding the page"
 * as PiP can manage.
 */
export function LostPixels() {
  const [won, setWon] = useState(false);
  useEffect(() => {
    behaviour.setRoute("/404");
    const t = setTimeout(() => behaviour.say("notFound", { state: "lost", stateMs: 8000 }), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div>
      <GameHost game="forge" open inline onClose={() => undefined} onWin={() => setWon(true)} />
      <p className="mt-4 text-small text-bone-400" aria-live="polite">
        {won ? "That's the mark rebuilt. The page is still missing, but at least the pixels are home." : "Some of the page's pixels escaped. Gather them onto the mark and PiP will stop looking under things."}
      </p>
    </div>
  );
}
