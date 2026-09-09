"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";
import { behaviour, type Persisted } from "../behaviour/store";

/**
 * Keeps a signed-in account's PiP history in step with the browser copy so a
 * returning user never hears a line twice even on a new device. Local
 * storage stays the source of truth offline; the server copy is merged on
 * load and updated a few seconds after anything changes.
 */
export function PipAccountSync() {
  const { data } = authClient.useSession();
  const userId = data?.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    fetch("/api/experience", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((json: { experience?: Partial<Persisted> | null } | null) => {
      if (!stopped && json?.experience) behaviour.mergeRemote(json.experience);
    }).catch(() => undefined);
    const off = behaviour.onSync((p) => {
      const body = JSON.stringify({ shown: p.shown, games: p.games, hidden: p.hidden, syncedAt: Date.now() });
      fetch("/api/experience", { method: "PUT", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    });
    return () => { stopped = true; off(); };
  }, [userId]);
  return null;
}
