"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster, type Toast } from "./Toaster";
import { copy } from "@content/microcopy";

type RealtimeState = { connected: boolean; unread: number; lastEventAt: number };
type Listener = (type: string, data: Record<string, unknown>) => void;
type Api = RealtimeState & { subscribe: (l: Listener) => () => void; setUnread: (n: number | ((n: number) => number)) => void; toast: (t: Omit<Toast, "id">) => void };

const Ctx = createContext<Api | null>(null);
export const useRealtime = () => { const c = useContext(Ctx); if (!c) throw new Error("useRealtime outside provider"); return c; };

/**
 * One authenticated event subscription per tab. Events refresh server components, raise toasts
 * (batched, at most three visible), update the unread badge and, when the
 * user opted in, send a browser notification while the tab is hidden.
 */
export function RealtimeProvider({ children, initialUnread, area, userId }: { children: ReactNode; initialUnread: number; area: "portal" | "admin"; userId: string }) {
  const router = useRouter();
  const [state, setState] = useState<RealtimeState>({ connected: false, unread: initialUnread, lastEventAt: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const listeners = useRef(new Set<Listener>());
  const refreshTimer = useRef(0);
  // Queue lives in refs and is never touched inside a state updater, so
  // StrictMode's double invocation cannot drop a toast. At most three show.
  const toastQueue = useRef<Toast[]>([]);
  const visible = useRef(0);
  useEffect(() => { visible.current = toasts.length; }, [toasts.length]);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const item: Toast = { id: crypto.randomUUID(), ...t };
    if (visible.current >= 3) { toastQueue.current.push(item); return; }
    visible.current += 1;
    setToasts((cur) => (cur.some((x) => x.id === item.id) ? cur : [...cur, item]));
  }, []);
  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    visible.current = Math.max(0, visible.current - 1);
    const next = toastQueue.current.shift();
    if (next) { visible.current += 1; setToasts((cur) => (cur.some((x) => x.id === next.id) ? cur : [...cur, next])); }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => router.refresh(), 250);
  }, [router]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let cursor = Date.now();
    let retry = 2000;
    const seen = new Map<string, number>();
    const controller = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch("/api/realtime?since=" + cursor, { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { router.refresh(); return; }
        if (!response.ok) throw new Error("Realtime unavailable");
        const result = await response.json() as { events: { type: string; data: Record<string, unknown> }[]; cursor: number; unread: number; resync: boolean };
        if (stopped) return;
        for (const { type, data } of result.events) {
          const id = String(data.eventId ?? data.id);
          if (seen.has(id)) continue;
          seen.set(id, Number(data.at));
          for (const listener of listeners.current) listener(type, data);
          if (type === "notification") {
            const href = typeof data.href === "string" ? `/${area}${data.href}` : undefined;
            const category = String(data.category ?? "default");
            const headline = copy.notifications.headline[category as keyof typeof copy.notifications.headline] ?? copy.notifications.headline.default;
            const actor = typeof data.actorName === "string" && data.actorName ? data.actorName : null;
            const event = String(data.title ?? "Update");
            // Personality in the headline; the real event, with who did it, in the body.
            toast({ title: headline, body: [actor ? `${actor}: ${event}` : event, data.body ? String(data.body) : null].filter(Boolean).join(" · "), href, kind: category });
            if (data.browser && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
              try { new Notification(String(data.title), { body: data.body ? String(data.body) : undefined, tag: id }); } catch { /* unavailable */ }
            }
          }
          if (type !== "typing" && type !== "presence") scheduleRefresh();
        }
        if (result.resync) scheduleRefresh();
        cursor = result.cursor;
        for (const [id, at] of seen) if (at < cursor - 900_000) seen.delete(id);
        setState({ connected: true, unread: result.unread, lastEventAt: Date.now() });
        retry = 2000;
      } catch {
        if (!stopped) setState((s) => ({ ...s, connected: false }));
        retry = Math.min(15000, retry * 1.8);
      } finally {
        if (!stopped) timer = setTimeout(poll, document.hidden ? 15000 : retry);
      }
    };
    void poll();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); clearTimeout(refreshTimer.current); };
  }, [area, userId, scheduleRefresh, toast, router]);

  const api: Api = {
    ...state,
    subscribe: (l) => { listeners.current.add(l); return () => { listeners.current.delete(l); }; },
    setUnread: (n) => setState((s) => ({ ...s, unread: typeof n === "function" ? n(s.unread) : n })),
    toast,
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
      {!state.connected && state.lastEventAt > 0 && (
        <div className="fixed bottom-4 left-4 z-[80] rounded-md border border-line bg-ink-850 px-3 py-2 text-[0.75rem] text-bone-400" role="status">{copy.notifications.reconnecting}</div>
      )}
    </Ctx.Provider>
  );
}
