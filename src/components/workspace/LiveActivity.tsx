"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRealtime } from "@/components/app/RealtimeProvider";
import { ActivityFeed, type ActivityItem } from "./ActivityFeed";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

/**
 * The dashboard's live feed. Server-rendered history, plus events that arrive
 * over the realtime channel are shown the instant they land (before the
 * server refresh catches up and replaces them with the persisted record).
 * The green dot is the real connection state, not a decoration.
 */
export function LiveActivity({ items, area }: { items: ActivityItem[]; area: "portal" | "admin" }) {
  const { subscribe, connected, lastEventAt } = useRealtime();
  const [incoming, setIncoming] = useState<ActivityItem[]>([]);

  useEffect(() => subscribe((type, data) => {
    if (type === "typing" || type === "presence") return;
    const summary = describe(type, data);
    if (!summary) return;
    const item: ActivityItem = {
      id: `live-${String(data.id ?? Date.now())}`, kind: type, summary, href: typeof data.href === "string" ? data.href : null, createdAt: new Date(Number(data.at ?? Date.now())),
      internal: false, actorName: typeof data.actorName === "string" ? data.actorName : null, actorImage: null, projectTitle: null, projectCode: null,
    };
    setIncoming((cur) => [item, ...cur.filter((c) => c.id !== item.id)].slice(0, 5));
  }), [subscribe]);

  // Once the server has re-rendered with the persisted rows, provisional entries older than the newest row are redundant.
  const newest = items[0]?.createdAt.getTime() ?? 0;
  const provisional = incoming.filter((c) => c.createdAt.getTime() > newest);

  return (
    <div data-testid="live-activity">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-[0.75rem] text-bone-400">
          <span className={cn("h-2 w-2 rounded-pill", connected ? "bg-[#7ed0a2]" : "bg-[#f0b35a]")} aria-hidden="true" />
          {connected ? "Live" : copy.notifications.reconnecting}{lastEventAt ? "" : ""}
        </p>
        <Link href={`/${area}/activity`} className="text-[0.75rem] text-forge-300">All activity</Link>
      </div>
      {provisional.length + items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[0.8125rem] text-bone-400">{copy.admin.liveEmpty}</p>
      ) : (
        <ActivityFeed items={[...provisional, ...items]} area={area} showProject compact />
      )}
    </div>
  );
}

function describe(type: string, data: Record<string, unknown>): string | null {
  const who = typeof data.actorName === "string" && data.actorName ? data.actorName : "Someone";
  switch (type) {
    case "message": return `${who} sent a message`;
    case "request.created": return `${who} submitted a request`;
    case "request.updated": return `Request moved to ${String(data.status ?? "a new status").replace(/_/g, " ")}`;
    case "task.created": return `${who} added a task`;
    case "task.updated": return `Task moved to ${String(data.status ?? "a new column").replace(/_/g, " ")}`;
    case "file.created": return `${who} uploaded ${String(data.name ?? "a file")}`;
    case "approval.updated": return `Approval ${String(data.status ?? "updated").replace(/_/g, " ")}`;
    case "project.updated": return typeof data.kind === "string" ? `Project activity: ${data.kind.replace(/[._]/g, " ")}` : "Project updated";
    case "notification": return typeof data.title === "string" ? data.title : null;
    default: return null;
  }
}
