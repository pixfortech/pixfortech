"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { moveTaskAction } from "@/server/actions/tasks";
import { Avatar, Badge, dueTone, fmtDate, humanise, priorityTone } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export type BoardTask = { id: string; key: string; title: string; status: string; priority: string; dueDate: Date | null; assigneeName: string | null; assigneeImage: string | null; projectCode: string; projectTitle: string; clientVisible: boolean; labels: string | null };
const COLS = [["todo", "To do"], ["in_progress", "In progress"], ["in_review", "In review"], ["blocked", "Blocked"], ["done", "Done"]] as const;

/** Kanban with native pointer drag and drop plus keyboard moves. Optimistic, server-confirmed. */
export function TaskBoard({ tasks, showProject }: { tasks: BoardTask[]; showProject?: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [optimistic, apply] = useOptimistic(tasks, (state, patch: { id: string; status: string }) => state.map((t) => (t.id === patch.id ? { ...t, status: patch.status } : t)));
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const move = (id: string, status: string) => {
    const t = optimistic.find((x) => x.id === id);
    if (!t || t.status === status) return;
    start(async () => {
      apply({ id, status });
      const res = await moveTaskAction({ id, status: status as "todo" });
      if (!res.ok) setError(res.error); else router.refresh();
    });
  };
  const backlog = optimistic.filter((t) => t.status === "backlog");

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-[0.8125rem] text-forge-300">{error}</p>}
      <div className="grid gap-3 md:grid-cols-5">
        {COLS.map(([status, label]) => {
          const items = optimistic.filter((t) => t.status === status || (status === "todo" && t.status === "backlog"));
          return (
            <section key={status} aria-label={label} data-over={over === status} className="pf-kanban-col flex min-h-[10rem] flex-col rounded-lg border border-line bg-ink-850/50" onDragOver={(e) => { e.preventDefault(); setOver(status); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/task") || dragging; if (id) move(id, status); setOver(null); setDragging(null); }}>
              <header className="flex items-center justify-between px-3 py-2.5"><h3 className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-bone-400">{label}</h3><span className="num text-[0.75rem] text-bone-600">{items.length}</span></header>
              <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {items.map((t) => (
                  <li key={t.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/task", t.id); setDragging(t.id); }} onDragEnd={() => setDragging(null)} className={cn("pf-drag rounded-md border border-line bg-ink-900 p-3 text-[0.8125rem] shadow-1", dragging === t.id && "opacity-50")}>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/tasks/${t.id}`} className="font-medium text-bone-50 hover:text-forge-300">{t.title}</Link>
                      <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                    </div>
                    <p className="num mt-1 text-[0.6875rem] text-bone-500 text-bone-400">{t.key}{showProject ? ` · ${t.projectCode}` : ""}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[0.75rem] text-bone-400">{t.assigneeName ? <><Avatar name={t.assigneeName} image={t.assigneeImage} size={16} />{t.assigneeName.split(" ")[0]}</> : "Unassigned"}</span>
                      {t.dueDate && <Badge tone={dueTone(t.dueDate, t.status === "done")}>{fmtDate(t.dueDate)}</Badge>}
                    </div>
                    <label className="sr-only" htmlFor={`mv-${t.id}`}>Move {t.title}</label>
                    <select id={`mv-${t.id}`} value={t.status === "backlog" ? "todo" : t.status} onChange={(e) => move(t.id, e.target.value)} className="mt-2 w-full rounded-sm border border-line bg-ink-850 px-1 py-0.5 text-[0.6875rem] text-bone-400 md:sr-only md:focus:not-sr-only">
                      {COLS.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
                    </select>
                  </li>
                ))}
                {items.length === 0 && <li className="rounded-md border border-dashed border-line-faint px-3 py-4 text-center text-[0.75rem] text-bone-600">{status === "done" ? "Nothing finished yet." : "Nothing here."}</li>}
              </ul>
            </section>
          );
        })}
      </div>
      {backlog.length > 0 && <p className="mt-2 text-[0.75rem] text-bone-600">{backlog.length} backlog item{backlog.length > 1 ? "s" : ""} shown in To do. {humanise("drag_to_move")}.</p>}
    </div>
  );
}
