"use client";

import { useTimeAgo } from "@/components/app/TimeProvider";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTaskCommentAction } from "@/server/actions/tasks";
import { AppButton, Avatar, Badge, inputCls } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export function TaskComments({ taskId, comments, clientVisibleTask }: { taskId: string; comments: { id: string; body: string; internal: boolean; createdAt: Date; authorName: string; authorImage: string | null }[]; clientVisibleTask: boolean }) {
  const timeAgo = useTimeAgo();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(true);
  return (
    <div>
      <ol className="flex flex-col gap-2">{comments.length === 0 && <li className="text-[0.8125rem] text-bone-400">No comments yet.</li>}{comments.map((c) => <li key={c.id} className={cn("rounded-md border border-line p-3", c.internal && "pf-internal")}><p className="flex items-center gap-2 text-[0.75rem]"><Avatar name={c.authorName} image={c.authorImage} size={16} /><span className="font-semibold text-bone-50">{c.authorName}</span>{c.internal && <Badge tone="internal">Internal</Badge>}<span className="text-bone-600">{timeAgo(c.createdAt)}</span></p><p className="mt-1 whitespace-pre-wrap text-[0.875rem] text-bone-200">{c.body}</p></li>)}</ol>
      <div className={cn("mt-3 rounded-md border border-line p-3", internal && "pf-internal")}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} aria-label="Comment" className={inputCls} placeholder={internal ? "Internal comment…" : "Comment visible to the client…"} />
        <div className="mt-2 flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-[0.8125rem] text-bone-200"><input type="checkbox" checked={internal} disabled={!clientVisibleTask} onChange={(e) => setInternal(e.target.checked)} className="accent-[#f0b35a]" /> Internal {!clientVisibleTask && <span className="text-bone-600">(task is not client-visible)</span>}</label><AppButton size="sm" disabled={pending || !body.trim()} onClick={() => start(async () => { const r = await addTaskCommentAction({ taskId, body, internal }); if (r.ok) { setBody(""); router.refresh(); } })}>Post</AppButton></div>
      </div>
    </div>
  );
}
