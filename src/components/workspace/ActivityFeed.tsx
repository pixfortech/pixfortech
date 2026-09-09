"use client";

import Link from "next/link";
import { Avatar, Badge } from "@/components/app/primitives";
import { useTimeAgo } from "@/components/app/TimeProvider";

export type ActivityItem = { id: string; kind: string; summary: string; href: string | null; createdAt: Date; internal: boolean; actorName: string | null; actorImage: string | null; projectTitle?: string | null; projectCode?: string | null };

export function ActivityFeed({ items, area, showProject, compact }: { items: ActivityItem[]; area: "portal" | "admin"; showProject?: boolean; compact?: boolean }) {
  const timeAgo = useTimeAgo();
  if (!items.length) return <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[0.8125rem] text-bone-400">Nothing has happened yet. It will.</p>;
  return (
    <ol className="relative ml-3 border-l border-line">
      {items.map((a) => (
        <li key={a.id} className={compact ? "relative pb-3 pl-5 last:pb-0" : "relative pb-4 pl-5 last:pb-0"}>
          <span className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-xs ${a.internal ? "bg-[#f0b35a]" : "bg-forge-500"}`} aria-hidden="true" />
          <p className="break-words text-[0.8125rem] text-bone-200"><span className="inline-flex items-center gap-1.5 font-medium text-bone-50"><Avatar name={a.actorName ?? "System"} image={a.actorImage} size={16} />{a.actorName ?? "System"}</span> {a.href ? <Link href={`/${area}${a.href}`} className="hover:text-forge-300">{a.summary}</Link> : a.summary}</p>
          <p className="num mt-0.5 flex flex-wrap items-center gap-2 text-[0.6875rem] text-bone-600">{timeAgo(a.createdAt)}{showProject && a.projectCode && <span>· {a.projectCode}</span>}{a.internal && <Badge tone="internal">Internal</Badge>}</p>
        </li>
      ))}
    </ol>
  );
}
