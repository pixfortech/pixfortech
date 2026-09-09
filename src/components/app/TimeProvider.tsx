"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { timeAgo } from "./primitives";

const Clock = createContext<number | null>(null);

/** Share the server's display time through hydration, then keep labels current. */
export function TimeProvider({ renderedAt, children }: { renderedAt: number; children?: ReactNode }) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return <Clock.Provider value={now}>{children}</Clock.Provider>;
}

export function useDisplayTime() {
  const now = useContext(Clock);
  if (now === null) throw new Error("Display time requires TimeProvider");
  return now;
}

export function useTimeAgo() {
  const now = useDisplayTime();
  return (date: Date | number | null | undefined) => timeAgo(date, now);
}
