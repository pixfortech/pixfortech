"use client";

import { useTimeAgo } from "@/components/app/TimeProvider";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRealtime } from "./RealtimeProvider";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/collab";
import { Avatar } from "./primitives";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

export type NotificationItem = { id: string; category: string; title: string; body: string | null; href: string | null; readAt: Date | null; createdAt: Date; actorName: string | null; actorImage?: string | null; projectTitle: string | null };

const CATEGORY_LABEL: Record<string, string> = { message: "Message", mention: "Mention", request: "Request", task: "Task", approval: "Approval", milestone: "Milestone", file: "File", project: "Project", due: "Due" };

/**
 * The bell: unread count, a keyboard-operable popover with the latest
 * notifications (who, what, which project, when), per-item and bulk
 * mark-as-read, and a link to preferences. Live events land here through the
 * realtime provider; the unread count is the server's, not a guess.
 */
export function NotificationBell({ items, area }: { items: NotificationItem[]; area: "portal" | "admin" }) {
  const timeAgo = useTimeAgo();
  const { unread, setUnread, subscribe } = useRealtime();
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<NotificationItem[]>([]);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => subscribe((type, data) => {
    if (type !== "notification") return;
    const item: NotificationItem = { id: String(data.id), category: String(data.category ?? "project"), title: String(data.title ?? "Update"), body: data.body ? String(data.body) : null, href: typeof data.href === "string" ? data.href : null, readAt: null, createdAt: new Date(Number(data.at ?? Date.now())), actorName: typeof data.actorName === "string" ? data.actorName : null, actorImage: null, projectTitle: null };
    setLive((cur) => [item, ...cur.filter((c) => c.id !== item.id)].slice(0, 8));
  }), [subscribe]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Provisional live copies give way to the persisted rows once the server re-renders.
  const list = [...live.filter((c) => !items.some((i) => i.id === c.id)), ...items].slice(0, 12);
  return (
    <div className="relative" ref={ref}>
      <button ref={button} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} data-testid="bell" className="relative grid h-9 w-9 place-items-center rounded-md text-bone-200 hover:bg-bone-50/5 hover:text-bone-50 focus-visible:outline-2 focus-visible:outline-forge-400">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 8a5 5 0 0 1 10 0v3l1.5 2.5h-13L5 11V8Z" /><path d="M8 16a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <span data-testid="unread-count" className="num absolute -right-0.5 -top-0.5 min-w-4 rounded-pill bg-forge-500 px-1 text-center text-[0.625rem] font-semibold leading-4 text-ink-950" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" data-testid="notification-popover" className="absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-line bg-ink-850 shadow-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[0.8125rem] font-semibold">Notifications{unread ? <span className="num ml-2 text-[0.6875rem] font-medium text-forge-300">{unread} unread</span> : null}</p>
            <button type="button" disabled={pending || !unread} onClick={() => start(async () => { await markAllNotificationsReadAction({}); setUnread(0); setLive((cur) => cur.map((n) => ({ ...n, readAt: new Date() }))); })} className="text-[0.75rem] text-bone-400 hover:text-bone-50 disabled:opacity-40">{copy.notifications.markAll}</button>
          </div>
          <ul className="max-h-[24rem] overflow-y-auto" data-testid="notification-list">
            {list.length === 0 && <li className="px-4 py-8 text-center text-[0.8125rem] text-bone-400">{copy.notifications.bellEmpty}</li>}
            {list.map((n) => (
              <li key={n.id} className={cn("border-b border-line-faint last:border-0", !n.readAt && "bg-forge-500/5")}>
                <Link href={n.href ? `/${area}${n.href}` : `/${area}/notifications`} onClick={() => { setOpen(false); if (!n.readAt) { start(async () => { await markNotificationReadAction({ id: n.id }); setUnread((u) => Math.max(0, u - 1)); }); } }} className="flex gap-3 px-4 py-3 hover:bg-bone-50/5">
                  {n.actorName ? <Avatar name={n.actorName} image={n.actorImage} size={28} className="mt-0.5" /> : <span className="mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-ink-900 text-forge-400" aria-hidden="true"><span className="h-2 w-2 bg-current" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="rounded-xs border border-line px-1 text-[0.625rem] uppercase tracking-[0.06em] text-bone-400">{CATEGORY_LABEL[n.category] ?? n.category}</span>
                      {!n.readAt && <span className="h-1.5 w-1.5 bg-forge-500" aria-label="unread" />}
                    </span>
                    <span className="mt-1 block text-[0.8125rem] font-medium text-bone-50">{n.actorName ? <span className="text-bone-200">{n.actorName} · </span> : null}{n.title}</span>
                    {n.body && <span className="block truncate text-[0.75rem] text-bone-400">{n.body}</span>}
                    <span className="num mt-0.5 block text-[0.6875rem] text-bone-600">{n.projectTitle ? `${n.projectTitle} · ` : ""}{timeAgo(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[0.75rem]">
            <Link href={`/${area}/settings`} onClick={() => setOpen(false)} className="text-bone-400 hover:text-bone-50">Preferences</Link>
            <Link href={`/${area}/notifications`} onClick={() => setOpen(false)} className="font-medium text-forge-300 hover:text-forge-400">All notifications →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
