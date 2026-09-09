"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { behaviour } from "../behaviour/store";
import { Mascot } from "./Mascot";
import dynamic from "next/dynamic";
const GameHost = dynamic(() => import("../game/GameHost").then((m) => m.GameHost), { ssr: false });
import type { GameId } from "../behaviour/messages";
import { PipAccountSync } from "./PipAccountSync";

/**
 * PiP inside the product and the sign-in screens: quiet mode. No dwell
 * prompts, no game invitations, no idle chatter. He speaks only for events
 * that happened (signed in, profile saved, unread notifications, an empty
 * dashboard, offline/online) and when poked. Still hideable, still restorable.
 */
export function WorkspacePip({ mode, unread, empty }: { mode: "auth" | "admin" | "portal"; unread?: number; empty?: boolean }) {
  const pathname = usePathname();
  const [game, setGame] = useState<{ id: GameId; session: number; seed: number } | null>(null);

  useEffect(() => { behaviour.hydrate(); behaviour.setQuiet(true); return () => behaviour.setQuiet(false); }, []);
  useEffect(() => { behaviour.setRoute(pathname); }, [pathname]);

  // Sign-in screen: one line, once per session.
  useEffect(() => {
    if (mode !== "auth") return;
    const t = setTimeout(() => behaviour.sayRoute("/login"), 2500);
    return () => clearTimeout(t);
  }, [mode]);

  // Dashboard arrival: greet once per session, then report unread work or an empty forge.
  useEffect(() => {
    if (mode === "auth") return;
    const key = "pf:pip:welcomed";
    let welcomed = false;
    try { welcomed = sessionStorage.getItem(key) === "1"; } catch { /* ignore */ }
    const t = setTimeout(() => {
      if (!welcomed) { behaviour.say("loginSuccess", { state: "celebrating", stateMs: 2500 }); try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ } return; }
      if (empty) behaviour.say("dashboardEmpty", { state: "curious", stateMs: 3000 });
      else if ((unread ?? 0) > 0) behaviour.say("notification", { state: "guiding", stateMs: 3000 });
      else behaviour.say("dashboard", { state: "idle" });
    }, 1800);
    return () => clearTimeout(t);
    // Only on first mount of a surface; unread changes are reported by the bell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Offline and reconnection also matter here.
  useEffect(() => {
    const off = () => { behaviour.setOnline(false); behaviour.say("offline", { force: true, state: "lost", stateMs: 5000 }); };
    const on = () => { behaviour.setOnline(true); behaviour.say("reconnect", { force: true, state: "celebrating", stateMs: 2500 }); };
    window.addEventListener("offline", off); window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);

  return (
    <>
      <PipAccountSync />
      <Mascot compact onPlay={(id) => setGame((g) => ({ id, session: (g?.session ?? 0) + 1, seed: Date.now() & 0xfffff }))} />
      {game && <GameHost key={game.session} game={game.id} open onClose={() => setGame(null)} seed={game.seed} />}
    </>
  );
}
