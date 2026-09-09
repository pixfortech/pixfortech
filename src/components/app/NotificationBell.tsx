"use client";

import { useTimeAgo } from "@/components/app/TimeProvider";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRealtime } from "./RealtimeProvider";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/collab";

import { cn } from "@/lib/utils";

export type NotificationItem = { id: string; category: string; title: string; body: string | null; href: string | null; readAt: Date | null; createdAt: Date; actorName: string | null; projectTitle: string | null };

export function NotificationBell({ items, area }: { items: NotificationItem[]; area: "portal" | "admin" }) {
  const timeAgo = useTimeAgo();
  const { unread, setUnread } = useRealtime();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} data-testid="bell" className="relative grid h-9 w-9 place-items-center rounded-md text-bone-200 hover:bg-bone-50/5 hover:text-bone-50 focus-visible:outline-2 focus-visible:outline-forge-400">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 8a5 5 0 0 1 10 0v3l1.5 2.5h-13L5 11V8Z" /><path d="M8 16a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <span data-testid="unread-count" className="num absolute -right-0.5 -top-0.5 min-w-4 rounded-pill bg-forge-500 px-1 text-center text-[0.625rem] font-semibold leading-4 text-ink-950" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-line bg-ink-850 shadow-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[0.8125rem] font-semibold">Notifications</p>
            <button type="button" disabled={pending || !unread} onClick={() => start(async () => { await markAllNotificationsReadAction({}); setUnread(0); })} className="text-[0.75rem] text-bone-400 hover:text-bone-50 disabled:opacity-40">Mark all read</button>
          </div>
          <ul className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-[0.8125rem] text-bone-400">All quiet in the forge.</li>}
            {items.slice(0, 12).map((n) => (
              <li key={n.id} className={cn("border-b border-line-faint last:border-0", !n.readAt && "bg-forge-500/5")}>
                <Link href={n.href ? `/${area}${n.href}` : `/${area}/notifications`} onClick={() => { setOpen(false); if (!n.readAt) { start(async () => { await markNotificationReadAction({ id: n.id }); setUnread((u) => Math.max(0, u - 1)); }); } }} className="flex gap-3 px-4 py-3 hover:bg-bone-50/5">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0", n.readAt ? "bg-line-strong" : "bg-forge-500")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-bone-50">{n.title}</span>
                    {n.body && <span className="block truncate text-[0.75rem] text-bone-400">{n.body}</span>}
                    <span className="num mt-0.5 block text-[0.6875rem] text-bone-600">{n.projectTitle ? `${n.projectTitle} · ` : ""}{timeAgo(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2 text-right"><Link href={`/${area}/notifications`} onClick={() => setOpen(false)} className="text-[0.75rem] font-medium text-forge-300 hover:text-forge-400">All notifications →</Link></div>
        </div>
      )}
    </div>
  );
}
