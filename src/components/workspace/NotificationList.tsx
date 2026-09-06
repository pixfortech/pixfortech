"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/collab";
import { useRealtime } from "@/components/app/RealtimeProvider";
import { AppButton, Badge, EmptyState, timeAgo, humanise } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export function NotificationList({ items, area }: { items: { id: string; category: string; title: string; body: string | null; href: string | null; readAt: Date | null; createdAt: Date; projectTitle: string | null; actorName: string | null }[]; area: "portal" | "admin" }) {
  const router = useRouter();
  const { setUnread } = useRealtime();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.readAt).length;
  if (!items.length) return <EmptyState title="All quiet in the forge" body="Nothing needs your attention right now." />;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[0.8125rem] text-bone-400"><span>{unread ? `${unread} unread` : "All read"}</span><AppButton size="sm" variant="ghost" disabled={pending || !unread} onClick={() => start(async () => { await markAllNotificationsReadAction({}); setUnread(0); router.refresh(); })}>Mark all read</AppButton></div>
      <ul className="divide-y divide-line-faint rounded-lg border border-line">
        {items.map((n) => (
          <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", !n.readAt && "bg-forge-500/5")}>
            <span className={cn("mt-2 h-2 w-2 shrink-0", n.readAt ? "bg-line-strong" : "bg-forge-500")} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[0.6875rem]"><Badge tone="neutral">{humanise(n.category)}</Badge>{n.projectTitle && <span className="text-bone-600">{n.projectTitle}</span>}<span className="num text-bone-600">{timeAgo(n.createdAt)}</span></p>
              <p className="mt-0.5 text-[0.875rem] font-medium text-bone-50">{n.title}</p>
              {n.body && <p className="text-[0.8125rem] text-bone-400">{n.body}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {n.href && <Link href={`/${area}${n.href}`} onClick={() => { if (!n.readAt) start(async () => { await markNotificationReadAction({ id: n.id }); setUnread((u) => Math.max(0, u - 1)); }); }} className="text-[0.8125rem] font-medium text-forge-300 hover:text-forge-400">Open →</Link>}
              {!n.readAt && <button type="button" disabled={pending} onClick={() => start(async () => { await markNotificationReadAction({ id: n.id }); setUnread((u) => Math.max(0, u - 1)); router.refresh(); })} className="text-[0.75rem] text-bone-400 hover:text-bone-50">Mark read</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
