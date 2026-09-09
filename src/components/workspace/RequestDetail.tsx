"use client";

import { useTimeAgo } from "@/components/app/TimeProvider";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addRequestCommentAction, assignRequestAction, transitionRequestAction } from "@/server/actions/requests";
import { createTaskAction } from "@/server/actions/tasks";
import { requestApprovalAction } from "@/server/actions/collab";
import { AppButton, Avatar, Badge, Card, CardHeader, fmtDate, Field, humanise, inputCls, priorityTone, selectCls, statusTone } from "@/components/app/primitives";
import { Uploader } from "./Uploader";
import { FileList, type FileItem } from "./FileList";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string; image: string | null; role?: string } | null;
export type RequestView = {
  id: string; ref: string; title: string; type: string; status: string; priority: string; description: string; area: string | null; reason: string | null; desiredDate: Date | null; estimate: string | null; estimatedCompletion: Date | null; createdAt: Date; updatedAt: Date;
  project: { id: string; code: string; title: string; organisationId: string; managerId: string | null };
  requester: Person; assignee: Person; transitions: string[];
  comments: { id: string; body: string; internal: boolean; createdAt: Date; authorId: string; authorName: string; authorImage: string | null; authorRole: string }[];
  files: FileItem[]; tasks: { id: string; key: string; title: string; status: string }[];
  history: { id: string; kind: string; summary: string; createdAt: Date; internal: boolean; actorName: string | null }[];
  approvals: { id: string; title: string; status: string; type: string }[];
};

const LABEL: Record<string, string> = { submitted: "Submitted", acknowledged: "Acknowledged", under_review: "Under review", needs_clarification: "Needs clarification", estimated: "Estimated", approved: "Approved", scheduled: "Scheduled", in_progress: "In progress", ready_for_review: "Ready for review", changes_requested: "Changes requested", completed: "Completed", closed: "Closed", rejected: "Rejected", cancelled: "Cancelled", on_hold: "On hold", blocked: "Blocked" };
const TYPE: Record<string, string> = { edit: "Edit", bug: "Bug", feature: "New feature", design: "Design change", content: "Content change", integration: "Integration", performance: "Performance", other: "Other" };
const PIPELINE = ["submitted", "under_review", "approved", "in_progress", "ready_for_review", "completed"];

export function RequestDetail({ r, area, staff, currentUserId, assignees }: { r: RequestView; area: "portal" | "admin"; staff: boolean; currentUserId: string; assignees: { id: string; name: string }[] }) {
  const timeAgo = useTimeAgo();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageIdx = Math.max(0, PIPELINE.indexOf(r.status));
  const closed = ["completed", "closed", "rejected", "cancelled"].includes(r.status);

  const move = (status: string) => start(async () => { setError(null); const res = await transitionRequestAction({ id: r.id, status }); if (!res.ok) setError(res.error); else router.refresh(); });
  const comment = () => { if (!note.trim()) return; start(async () => { const res = await addRequestCommentAction({ id: r.id, body: note, internal: staff && internal }); if (!res.ok) setError(res.error); else { setNote(""); router.refresh(); } }); };
  const linkTask = () => start(async () => { const res = await createTaskAction({ projectId: r.project.id, title: r.title, description: r.description, requestId: r.id, priority: r.priority as "medium", assigneeId: r.assignee?.id ?? "", clientVisible: true }); if (!res.ok) setError(res.error); else router.refresh(); });
  const askApproval = () => start(async () => { const res = await requestApprovalAction({ projectId: r.project.id, type: "request", title: `${r.ref} · ${r.title}`, description: "Please review the completed change and approve it, or tell us what still needs adjusting.", requestId: r.id }); if (!res.ok) setError(res.error); else router.refresh(); });

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        {/* Pipeline */}
        <Card className="p-5">
          <ol className="flex flex-wrap items-center gap-2 text-[0.75rem]" aria-label="Request pipeline">
            {PIPELINE.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span aria-current={i === stageIdx ? "step" : undefined} className={cn("flex items-center gap-1.5 rounded-pill border px-2.5 py-1", i < stageIdx ? "border-line text-bone-400" : i === stageIdx ? "border-forge-500 bg-forge-500/10 text-forge-300" : "border-line-faint text-bone-600")}>
                  <span className={cn("h-1.5 w-1.5", i <= stageIdx ? "bg-forge-500" : "bg-line-strong")} aria-hidden="true" />{LABEL[s]}
                </span>
                {i < PIPELINE.length - 1 && <span className="text-bone-600" aria-hidden="true">›</span>}
              </li>
            ))}
            {!PIPELINE.includes(r.status) && <li><Badge tone={statusTone(r.status)}>{LABEL[r.status]}</Badge></li>}
          </ol>
          {r.transitions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="text-[0.75rem] text-bone-400">{staff ? "Move to" : r.status === "ready_for_review" ? "Your decision" : r.status === "needs_clarification" ? "Answered? Send it back for review" : "Actions"}:</span>
              {r.transitions.map((t) => (
                <AppButton key={t} size="sm" variant={t === "completed" || t === "approved" ? "primary" : t === "rejected" || t === "cancelled" || t === "changes_requested" ? "danger" : "secondary"} disabled={pending} onClick={() => move(t)}>
                  {t === "completed" && !staff ? "Approve" : t === "changes_requested" && !staff ? "Request changes" : t === "under_review" && !staff ? "Send back for review" : LABEL[t] ?? humanise(t)}
                </AppButton>
              ))}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-[0.8125rem] text-forge-300">{error}</p>}
        </Card>

        <Card>
          <CardHeader title="Description" description={`${TYPE[r.type]} · submitted ${fmtDate(r.createdAt, true)}`} />
          <div className="px-5 pb-5">
            <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-bone-200">{r.description}</p>
            {r.reason && <div className="mt-4 rounded-md border border-line bg-ink-900 p-3 text-[0.8125rem]"><p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-bone-400">Why it matters</p><p className="text-bone-200">{r.reason}</p></div>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Attachments" description="Screenshots, documents and references." />
          <div className="flex flex-col gap-4 px-5 pb-5">
            <FileList files={r.files} staff={staff} currentUserId={currentUserId} />
            {!closed && <Uploader projectId={r.project.id} requestId={r.id} staff={staff} compact />}
          </div>
        </Card>

        <Card>
          <CardHeader title="Discussion" description={staff ? "Client-visible replies and internal notes. Internal notes never reach the portal." : "Replies from the Pixel Forge team appear here."} />
          <div className="px-5 pb-5">
            <ol className="flex flex-col gap-3">
              {r.comments.length === 0 && <li className="text-[0.8125rem] text-bone-400">No comments yet.</li>}
              {r.comments.map((c) => (
                <li key={c.id} className={cn("rounded-md border border-line p-3", c.internal && "pf-internal")}>
                  <p className="flex flex-wrap items-center gap-2 text-[0.75rem]"><Avatar name={c.authorName} image={c.authorImage} size={18} /><span className="font-semibold text-bone-50">{c.authorName}</span>{["super_admin", "admin", "project_manager", "team_member"].includes(c.authorRole) && <span className="text-forge-300">Pixel Forge</span>}{c.internal && <Badge tone="internal">Internal note</Badge>}<span className="text-bone-600">{timeAgo(c.createdAt)}</span></p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[0.875rem] text-bone-200">{c.body}</p>
                </li>
              ))}
            </ol>
            <div className={cn("mt-4 rounded-md border border-line p-3", staff && internal && "pf-internal")}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={staff && internal ? "Internal note. Only staff will see this." : "Write a reply…"} aria-label="Comment" className={inputCls} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {staff ? (
                  <label className="flex items-center gap-2 text-[0.8125rem] text-bone-200"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[#f0b35a]" /> Internal note <span className="text-bone-600">(hidden from the client)</span></label>
                ) : <span />}
                <AppButton size="sm" onClick={comment} disabled={pending || !note.trim()}>{staff && internal ? "Add internal note" : "Post reply"}</AppButton>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <aside className="flex flex-col gap-6 lg:col-span-4">
        <Card>
          <CardHeader title="Details" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-5 text-[0.8125rem]">
            <dt className="text-bone-400">Status</dt><dd data-testid="request-status"><Badge tone={statusTone(r.status)}>{LABEL[r.status]}</Badge></dd>
            <dt className="text-bone-400">Priority</dt><dd><Badge tone={priorityTone(r.priority)}>{humanise(r.priority)}</Badge></dd>
            <dt className="text-bone-400">Project</dt><dd><Link href={`/${area}/projects/${r.project.id}`} className="link-line text-bone-50">{r.project.code}</Link></dd>
            <dt className="text-bone-400">Area</dt><dd className="text-bone-200">{r.area ?? "—"}</dd>
            <dt className="text-bone-400">Requested by</dt><dd className="flex items-center gap-1.5 text-bone-200">{r.requester && <Avatar name={r.requester.name} image={r.requester.image} size={16} />}{r.requester?.name ?? "—"}</dd>
            <dt className="text-bone-400">Assigned to</dt><dd className="flex items-center gap-1.5 text-bone-200">{r.assignee && <Avatar name={r.assignee.name} image={r.assignee.image} size={16} />}{r.assignee?.name ?? "Unassigned"}</dd>
            <dt className="text-bone-400">Desired date</dt><dd className="text-bone-200">{fmtDate(r.desiredDate)}</dd>
            <dt className="text-bone-400">Estimate</dt><dd className="text-bone-200">{r.estimate ?? "—"}</dd>
            <dt className="text-bone-400">Expected</dt><dd className="text-bone-200">{fmtDate(r.estimatedCompletion)}</dd>
            <dt className="text-bone-400">Updated</dt><dd className="text-bone-200">{timeAgo(r.updatedAt)}</dd>
          </dl>
          {staff && !closed && (
            <form className="border-t border-line px-5 py-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { const res = await assignRequestAction({ id: r.id, assigneeId: String(fd.get("assigneeId") ?? ""), estimate: String(fd.get("estimate") ?? ""), estimatedCompletion: String(fd.get("estimatedCompletion") ?? "") }); if (!res.ok) setError(res.error); else router.refresh(); }); }}>
              <p className="mb-3 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-bone-400">Assignment and estimate</p>
              <div className="grid gap-3">
                <Field label="Assignee" htmlFor="assigneeId"><select id="assigneeId" name="assigneeId" defaultValue={r.assignee?.id ?? ""} className={selectCls}><option value="">Unassigned</option>{assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
                <Field label="Estimate" htmlFor="estimate" optional><input id="estimate" name="estimate" defaultValue={r.estimate ?? ""} placeholder="e.g. About half a day" className={inputCls} /></Field>
                <Field label="Expected completion" htmlFor="estimatedCompletion" optional><input id="estimatedCompletion" name="estimatedCompletion" type="date" defaultValue={r.estimatedCompletion ? r.estimatedCompletion.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
                <AppButton size="sm" type="submit" variant="secondary" disabled={pending}>Save</AppButton>
              </div>
            </form>
          )}
        </Card>

        {staff && (
          <Card>
            <CardHeader title="Implementation" description="Linked tasks and client approval." />
            <div className="flex flex-col gap-3 px-5 pb-5">
              {r.tasks.length === 0 ? <p className="text-[0.8125rem] text-bone-400">No task yet.</p> : (
                <ul className="flex flex-col gap-1.5">{r.tasks.map((t) => <li key={t.id}><Link href={`/admin/tasks/${t.id}`} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-[0.8125rem] hover:border-bone-50"><span className="truncate"><span className="num text-bone-400">{t.key}</span> {t.title}</span><Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge></Link></li>)}</ul>
              )}
              <div className="flex flex-wrap gap-2">
                {!closed && <AppButton size="sm" variant="secondary" disabled={pending} onClick={linkTask}>Create linked task</AppButton>}
                {r.status === "ready_for_review" && r.approvals.every((a) => a.status !== "pending") && <AppButton size="sm" variant="secondary" disabled={pending} onClick={askApproval}>Request client approval</AppButton>}
              </div>
            </div>
          </Card>
        )}
        {!staff && r.tasks.length > 0 && (
          <Card><CardHeader title="Work in progress" /><ul className="flex flex-col gap-1.5 px-5 pb-5">{r.tasks.map((t) => <li key={t.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-[0.8125rem]"><span className="truncate">{t.title}</span><Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge></li>)}</ul></Card>
        )}

        <Card>
          <CardHeader title="Timeline" />
          <ol className="relative ml-5 mr-5 mb-5 border-l border-line pl-4">
            {r.history.map((h) => (
              <li key={h.id} className="relative pb-4 last:pb-0 text-[0.8125rem]">
                <span className={cn("absolute -left-[1.3rem] top-1.5 h-2 w-2", h.internal ? "bg-[#f0b35a]" : "bg-forge-500")} aria-hidden="true" />
                <p className="text-bone-200"><span className="font-medium text-bone-50">{h.actorName ?? "System"}</span> {h.summary}</p>
                <p className="num text-[0.6875rem] text-bone-600">{fmtDate(h.createdAt, true)} · {timeAgo(h.createdAt)}{h.internal && " · internal"}</p>
              </li>
            ))}
          </ol>
        </Card>
      </aside>
    </div>
  );
}
