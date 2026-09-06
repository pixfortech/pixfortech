"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createMilestoneAction, updateMilestoneAction } from "@/server/actions/projects";
import { AppButton, Avatar, Badge, dueTone, Field, fmtDate, humanise, inputCls, Progress, selectCls, statusTone } from "@/components/app/primitives";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

export type MilestoneItem = { id: string; title: string; description: string | null; status: string; progress: number; startDate: Date | null; dueDate: Date | null; clientVisible: boolean; requiresApproval: boolean; owner: { id: string; name: string; image: string | null } | null; dependsOnId: string | null };

function bounds(items: MilestoneItem[]) {
  const today = Date.now();
  const all = items.filter((m) => m.startDate || m.dueDate);
  const min = Math.min(...all.map((m) => (m.startDate ?? m.dueDate)!.getTime()), today);
  const max = Math.max(...all.map((m) => (m.dueDate ?? m.startDate)!.getTime()), today);
  return { min, max, today };
}

export function Milestones({ items, projectId, staff, people }: { items: MilestoneItem[]; projectId: string; staff: boolean; people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<MilestoneItem | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"timeline" | "list">("timeline");

  const { min, max, today } = bounds(items);
  const span = Math.max(1, max - min);
  const pct = (t: number) => ((t - min) / span) * 100;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    payload.clientVisible = fd.get("clientVisible") === "on"; payload.requiresApproval = fd.get("requiresApproval") === "on";
    start(async () => {
      setError(null);
      const res = editing === "new" ? await createMilestoneAction({ ...payload, projectId }) : await updateMilestoneAction({ ...payload, id: (editing as MilestoneItem).id });
      if (!res.ok) { setError(res.error); return; }
      setEditing(null); router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border border-line p-0.5 text-[0.75rem]">
          {(["timeline", "list"] as const).map((v) => <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded-sm px-3 py-1 capitalize", view === v ? "bg-bone-50/10 text-bone-50" : "text-bone-400 hover:text-bone-50")} aria-pressed={view === v}>{v}</button>)}
        </div>
        {staff && <AppButton size="sm" onClick={() => setEditing("new")}>Add milestone</AppButton>}
      </div>
      {items.length === 0 && <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[0.8125rem] text-bone-400">No milestones yet. {staff ? "Add the first one to give the client a map." : "The plan will appear here once it is drawn up."}</p>}
      {view === "timeline" && items.length > 0 && (
        <div className="rounded-lg border border-line p-4">
          <div className="relative mb-2 h-4 text-[0.6875rem] text-bone-600"><span className="absolute left-0">{fmtDate(min)}</span><span className="absolute right-0">{fmtDate(max)}</span><span className="absolute -top-1 h-full w-px bg-forge-500" style={{ left: `${pct(today)}%` }} title="Today" /></div>
          <ol className="flex flex-col gap-2">
            {items.map((m) => {
              const s = (m.startDate ?? m.dueDate)?.getTime() ?? min, e = (m.dueDate ?? m.startDate)?.getTime() ?? s;
              return (
                <li key={m.id} className="grid grid-cols-[minmax(8rem,14rem)_1fr] items-center gap-3 text-[0.8125rem]">
                  <button type="button" onClick={() => staff && setEditing(m)} className={cn("truncate text-left", staff && "hover:text-forge-300")} title={m.title}><span className={cn("mr-2 inline-block h-2 w-2", m.status === "completed" ? "bg-[#7ed0a2]" : m.status === "blocked" ? "bg-[#ff6b6b]" : m.status === "awaiting_approval" ? "bg-[#f0b35a]" : "bg-forge-500")} aria-hidden="true" />{m.title}</button>
                  <div className="relative h-6 rounded-sm bg-ink-900">
                    <div className={cn("absolute top-1 h-4 rounded-xs", m.status === "completed" ? "bg-[#7ed0a2]/70" : "bg-forge-500/40")} style={{ left: `${pct(s)}%`, width: `${Math.max(1.5, pct(e) - pct(s))}%` }}>
                      <div className="h-full rounded-xs bg-forge-500" style={{ width: `${m.progress}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {view === "list" && items.length > 0 && (
        <ol className="flex flex-col gap-2">
          {items.map((m) => (
            <li key={m.id} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-medium text-bone-50">{m.title}</p>{m.description && <p className="mt-0.5 text-[0.8125rem] text-bone-400">{m.description}</p>}</div>
                <div className="flex items-center gap-2"><Badge tone={statusTone(m.status)}>{humanise(m.status)}</Badge>{m.requiresApproval && <Badge tone="cool">Approval</Badge>}{staff && !m.clientVisible && <Badge tone="internal">Internal</Badge>}</div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <Progress value={m.progress} tone={m.status === "completed" ? "good" : "hot"} label={`${m.title} progress`} />
                <span className="flex items-center gap-1.5 text-[0.75rem] text-bone-400">{m.owner && <><Avatar name={m.owner.name} image={m.owner.image} size={16} />{m.owner.name}</>}</span>
                <span className="text-[0.75rem]"><Badge tone={dueTone(m.dueDate, m.status === "completed")}>Due {fmtDate(m.dueDate)}</Badge></span>
              </div>
              {staff && <div className="mt-3"><AppButton size="sm" variant="ghost" onClick={() => setEditing(m)}>Edit</AppButton></div>}
            </li>
          ))}
        </ol>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New milestone" : "Edit milestone"}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="Title" htmlFor="ms-title"><input id="ms-title" name="title" defaultValue={editing && editing !== "new" ? editing.title : ""} className={inputCls} /></Field>
          <Field label="Description" htmlFor="ms-desc" optional><textarea id="ms-desc" name="description" rows={3} defaultValue={editing && editing !== "new" ? editing.description ?? "" : ""} className={inputCls} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="ms-status"><select id="ms-status" name="status" defaultValue={editing && editing !== "new" ? editing.status : "planned"} className={selectCls}>{["planned", "in_progress", "awaiting_approval", "completed", "blocked"].map((s) => <option key={s} value={s}>{humanise(s)}</option>)}</select></Field>
            <Field label="Progress %" htmlFor="ms-progress"><input id="ms-progress" name="progress" type="number" min={0} max={100} defaultValue={editing && editing !== "new" ? editing.progress : 0} className={inputCls} /></Field>
            <Field label="Owner" htmlFor="ms-owner" optional><select id="ms-owner" name="ownerId" defaultValue={editing && editing !== "new" ? editing.owner?.id ?? "" : ""} className={selectCls}><option value="">Unassigned</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Depends on" htmlFor="ms-dep" optional><select id="ms-dep" name="dependsOnId" defaultValue={editing && editing !== "new" ? editing.dependsOnId ?? "" : ""} className={selectCls}><option value="">None</option>{items.filter((m) => editing === "new" || m.id !== (editing as MilestoneItem)?.id).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>
            <Field label="Start" htmlFor="ms-start" optional><input id="ms-start" name="startDate" type="date" defaultValue={editing && editing !== "new" && editing.startDate ? editing.startDate.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
            <Field label="Due" htmlFor="ms-due" optional><input id="ms-due" name="dueDate" type="date" defaultValue={editing && editing !== "new" && editing.dueDate ? editing.dueDate.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-[0.8125rem] text-bone-200">
            <label className="flex items-center gap-2"><input type="checkbox" name="clientVisible" defaultChecked={editing === "new" ? true : editing?.clientVisible} className="accent-forge-500" /> Visible to the client</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="requiresApproval" defaultChecked={editing !== "new" && editing ? editing.requiresApproval : false} className="accent-forge-500" /> Needs client approval</label>
          </div>
          {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-4"><AppButton variant="ghost" onClick={() => setEditing(null)}>Cancel</AppButton><AppButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</AppButton></div>
        </form>
      </Modal>
    </div>
  );
}
