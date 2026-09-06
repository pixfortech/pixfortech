"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster, type Toast } from "./Toaster";

type RealtimeState = { connected: boolean; unread: number; lastEventAt: number };
type Listener = (type: string, data: Record<string, unknown>) => void;
type Api = RealtimeState & { subscribe: (l: Listener) => () => void; setUnread: (n: number | ((n: number) => number)) => void; toast: (t: Omit<Toast, "id">) => void };

const Ctx = createContext<Api | null>(null);
export const useRealtime = () => { const c = useContext(Ctx); if (!c) throw new Error("useRealtime outside provider"); return c; };

/**
 * One EventSource per tab. Events refresh server components, raise toasts
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
    let es: EventSource | null = null;
    let retry = 1000;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/realtime");
      es.addEventListener("ready", () => { retry = 1000; setState((s) => ({ ...s, connected: true })); });
      es.onerror = () => {
        setState((s) => ({ ...s, connected: false }));
        es?.close();
        if (!stopped) setTimeout(connect, Math.min(15000, (retry *= 1.8)));
      };
      const handle = (type: string) => (ev: MessageEvent) => {
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(ev.data); } catch { return; }
        setState((s) => ({ ...s, lastEventAt: Date.now() }));
        for (const l of listeners.current) l(type, data);
        if (type === "notification") {
          setState((s) => ({ ...s, unread: s.unread + 1 }));
          const href = typeof data.href === "string" ? `/${area}${data.href}` : undefined;
          toast({ title: String(data.title ?? "Update"), body: data.body ? String(data.body) : undefined, href, kind: String(data.category ?? "info") });
          if (data.browser && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(String(data.title), { body: data.body ? String(data.body) : undefined, tag: String(data.id) }); } catch { /* ignore */ }
          }
        }
        if (type !== "typing" && type !== "presence") scheduleRefresh();
      };
      for (const t of ["notification", "message", "request.created", "request.updated", "task.created", "task.updated", "project.updated", "approval.updated", "file.created", "typing", "presence"]) es.addEventListener(t, handle(t));
    };
    connect();
    return () => { stopped = true; es?.close(); clearTimeout(refreshTimer.current); };
  }, [area, userId, scheduleRefresh, toast]);

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
        <div className="fixed bottom-4 left-4 z-[80] rounded-md border border-line bg-ink-850 px-3 py-2 text-[0.75rem] text-bone-400" role="status">Reconnecting to live updates…</div>
      )}
    </Ctx.Provider>
  );
}
