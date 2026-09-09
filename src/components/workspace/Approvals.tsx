"use client";

import { useTimeAgo } from "@/components/app/TimeProvider";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideApprovalAction, requestApprovalAction } from "@/server/actions/collab";
import { AppButton, Avatar, Badge, Card, CardHeader, Field, fmtDate, humanise, inputCls, selectCls, statusTone } from "@/components/app/primitives";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

export type ApprovalItem = { id: string; type: string; title: string; description: string | null; status: string; versionLabel: string | null; dueDate: Date | null; createdAt: Date; decidedAt: Date | null; requestedBy: { name: string; image: string | null } | null; projectId: string; projectCode?: string; projectTitle?: string; decisions?: { id: string; decision: string; comment: string | null; createdAt: Date; userName: string; userImage: string | null }[] };

export function ApprovalList({ items, staff, canDecide, projectId, milestones, requests, showProject }: { items: ApprovalItem[]; staff: boolean; canDecide: boolean; projectId?: string; milestones?: { id: string; title: string }[]; requests?: { id: string; ref: string; title: string }[]; showProject?: boolean }) {
  const timeAgo = useTimeAgo();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deciding, setDeciding] = useState<{ id: string; decision: "approved" | "changes_requested" | "comment" } | null>(null);
  const [creating, setCreating] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const decide = () => { if (!deciding) return; start(async () => { setError(null); const res = await decideApprovalAction({ id: deciding.id, decision: deciding.decision, comment }); if (!res.ok) { setError(res.error); return; } setDeciding(null); setComment(""); router.refresh(); }); };
  const create = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { setError(null); const res = await requestApprovalAction({ ...Object.fromEntries(fd.entries()), projectId: projectId! }); if (!res.ok) { setError(res.error); return; } setCreating(false); router.refresh(); }); };

  return (
    <div>
      {staff && projectId && <div className="mb-4 flex justify-end"><AppButton size="sm" onClick={() => setCreating(true)}>Request approval</AppButton></div>}
      {items.length === 0 && <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[0.8125rem] text-bone-400">{canDecide ? "Nothing waiting on you. When the team needs a decision, it lands here." : "No approvals requested yet."}</p>}
      <ol className="flex flex-col gap-3">
        {items.map((a) => (
          <li key={a.id}>
            <Card>
              <CardHeader title={<span className="flex flex-wrap items-center gap-2">{a.title}{a.versionLabel && <Badge tone="cool">{a.versionLabel}</Badge>}<Badge tone={statusTone(a.status)}>{humanise(a.status)}</Badge></span>} description={`${humanise(a.type)}${showProject && a.projectCode ? ` · ${a.projectCode} ${a.projectTitle}` : ""} · requested ${timeAgo(a.createdAt)}${a.requestedBy ? ` by ${a.requestedBy.name}` : ""}${a.dueDate ? ` · decision by ${fmtDate(a.dueDate)}` : ""}`} />
              <div className="px-5 pb-5">
                {a.description && <p className="text-[0.875rem] text-bone-200">{a.description}</p>}
                {a.decisions && a.decisions.length > 0 && (
                  <ol className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                    {a.decisions.map((d) => (
                      <li key={d.id} className="flex gap-2 text-[0.8125rem]"><Avatar name={d.userName} image={d.userImage} size={18} /><div><p><span className="font-medium text-bone-50">{d.userName}</span> <span className="text-bone-400">{d.decision === "approved" ? "approved" : d.decision === "changes_requested" ? "requested changes" : "commented"} · {fmtDate(d.createdAt, true)}</span></p>{d.comment && <p className="text-bone-200">{d.comment}</p>}</div></li>
                    ))}
                  </ol>
                )}
                {a.status === "pending" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canDecide && <><AppButton size="sm" onClick={() => setDeciding({ id: a.id, decision: "approved" })}>Approve</AppButton><AppButton size="sm" variant="danger" onClick={() => setDeciding({ id: a.id, decision: "changes_requested" })}>Request changes</AppButton></>}
                    <AppButton size="sm" variant="secondary" onClick={() => setDeciding({ id: a.id, decision: "comment" })}>Comment</AppButton>
                  </div>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Modal open={deciding !== null} onClose={() => setDeciding(null)} title={deciding?.decision === "approved" ? "Approve" : deciding?.decision === "changes_requested" ? "Request changes" : "Add a comment"}>
        <div className="grid gap-4">
          <Field label={deciding?.decision === "approved" ? "Comment (optional)" : "What needs to change?"} htmlFor="ap-comment"><textarea id="ap-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={inputCls} /></Field>
          {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
          <div className="flex justify-end gap-2"><AppButton variant="ghost" onClick={() => setDeciding(null)}>Cancel</AppButton><AppButton onClick={decide} disabled={pending || (deciding?.decision !== "approved" && !comment.trim())} className={cn(deciding?.decision === "changes_requested" && "bg-[#ff9b9b]")}>{pending ? "Saving…" : deciding?.decision === "approved" ? "Approve" : deciding?.decision === "changes_requested" ? "Send" : "Post comment"}</AppButton></div>
        </div>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="Request client approval">
        <form onSubmit={create} className="grid gap-4" noValidate>
          <Field label="Type" htmlFor="ap-type"><select id="ap-type" name="type" defaultValue="milestone" className={selectCls}>{["design", "milestone", "request", "content", "staging", "delivery"].map((t) => <option key={t} value={t}>{humanise(t)}</option>)}</select></Field>
          <Field label="Title" htmlFor="ap-title"><input id="ap-title" name="title" className={inputCls} /></Field>
          <Field label="What should the client review?" htmlFor="ap-desc" optional><textarea id="ap-desc" name="description" rows={3} className={inputCls} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {milestones && <Field label="Milestone" htmlFor="ap-ms" optional><select id="ap-ms" name="milestoneId" defaultValue="" className={selectCls}><option value="">None</option>{milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>}
            {requests && <Field label="Request" htmlFor="ap-req" optional><select id="ap-req" name="requestId" defaultValue="" className={selectCls}><option value="">None</option>{requests.map((r) => <option key={r.id} value={r.id}>{r.ref} · {r.title}</option>)}</select></Field>}
            <Field label="Version label" htmlFor="ap-ver" optional><input id="ap-ver" name="versionLabel" placeholder="v1.2" className={inputCls} /></Field>
            <Field label="Decision needed by" htmlFor="ap-due" optional><input id="ap-due" name="dueDate" type="date" className={inputCls} /></Field>
          </div>
          {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-4"><AppButton variant="ghost" onClick={() => setCreating(false)}>Cancel</AppButton><AppButton type="submit" disabled={pending}>{pending ? "Sending…" : "Send for approval"}</AppButton></div>
        </form>
      </Modal>
    </div>
  );
}
