"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFileAction } from "@/server/actions/collab";
import { Avatar, Badge, EmptyState, timeAgo } from "@/components/app/primitives";
import { formatBytes } from "./format";

export type FileItem = { id: string; name: string; mime: string; size: number; version: number; createdAt: Date; clientVisible: boolean; uploader: { id: string; name: string; image: string | null } | null; projectCode?: string; projectTitle?: string };

const kind = (mime: string) => mime.startsWith("image/") ? "IMG" : mime === "application/pdf" ? "PDF" : mime.includes("zip") ? "ZIP" : mime.includes("sheet") || mime.includes("excel") ? "XLS" : mime.includes("word") ? "DOC" : "TXT";

export function FileList({ files, staff, currentUserId, showProject }: { files: FileItem[]; staff: boolean; currentUserId: string; showProject?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!files.length) return <EmptyState title="No files yet" body="Anything uploaded to this project will be listed here with who added it and when." />;
  return (
    <ul className="divide-y divide-line-faint rounded-lg border border-line">
      {files.map((f) => {
        const isImage = f.mime.startsWith("image/") && f.mime !== "image/svg+xml";
        return (
          <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${f.id}?inline=1`} alt="" className="h-10 w-10 shrink-0 rounded-sm border border-line object-cover" loading="lazy" />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-line bg-ink-900 text-[0.625rem] font-semibold text-bone-400">{kind(f.mime)}</span>
            )}
            <div className="min-w-0 flex-1">
              <a href={`/api/files/${f.id}`} className="block truncate text-[0.875rem] font-medium text-bone-50 hover:text-forge-300">{f.name}</a>
              <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-bone-400">
                <span>{formatBytes(f.size)}</span><span>·</span><span className="inline-flex items-center gap-1"><Avatar name={f.uploader?.name ?? "?"} image={f.uploader?.image} size={14} />{f.uploader?.name ?? "Unknown"}</span><span>·</span><span>{timeAgo(f.createdAt)}</span>
                {f.version > 1 && <Badge tone="cool">v{f.version}</Badge>}
                {staff && !f.clientVisible && <Badge tone="internal">Internal</Badge>}
                {showProject && f.projectCode && <span className="text-bone-600">· {f.projectCode}</span>}
              </p>
            </div>
            <a href={`/api/files/${f.id}`} className="hidden rounded-md border border-line px-2.5 py-1 text-[0.75rem] text-bone-200 hover:border-bone-50 sm:inline-block">Download</a>
            {(staff || f.uploader?.id === currentUserId) && (
              <button type="button" disabled={pending} onClick={() => { if (confirm(`Remove ${f.name}?`)) start(async () => { const r = await deleteFileAction({ id: f.id }); if (r.ok) router.refresh(); }); }} className="rounded-md px-2 py-1 text-[0.75rem] text-bone-400 hover:text-[#ff9b9b]" aria-label={`Delete ${f.name}`}>Remove</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
