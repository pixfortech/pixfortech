"use client";

import { useEffect, useState } from "react";

export function LocalTime({ timezone, label }: { timezone: string; label: string }) {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [timezone]);
  return (
    <span className="num inline-flex items-center gap-2 text-bone-400" suppressHydrationWarning>
      <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-forge-500">
        <span className="absolute inset-0 animate-ping rounded-full bg-forge-500/60 motion-reduce:hidden" />
      </span>
      {label} {time || "--:--"}
    </span>
  );
}
