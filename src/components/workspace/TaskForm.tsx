"use client";

import { useModalDone } from "./ModalButton";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTaskAction, updateTaskAction } from "@/server/actions/tasks";
import { AppButton, Field, inputCls, selectCls } from "@/components/app/primitives";

type Opt = { id: string; name?: string; title?: string };
export function TaskForm({ projectId, projects, people, milestones, task, onDone: onDoneProp }: { projectId?: string; projects?: { id: string; code: string; title: string }[]; people: Opt[]; milestones?: Opt[]; task?: { id: string; title: string; description: string | null; status: string; priority: string; assigneeId: string | null; dueDate: Date | null; milestoneId: string | null; clientVisible: boolean; labels: string | null }; onDone?: () => void }) {
  const modalDone = useModalDone();
  const onDone = onDoneProp ?? modalDone ?? undefined;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    payload.clientVisible = fd.get("clientVisible") === "on";
    payload.labels = String(fd.get("labels") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    start(async () => {
      setError(null); setErrors({});
      const res = task ? await updateTaskAction({ ...payload, id: task.id }) : await createTaskAction(payload);
      if (!res.ok) { setError(res.error); setErrors(res.fieldErrors ?? {}); return; }
      onDone?.(); router.refresh();
      if (!task && res.data) router.push(`/admin/tasks/${(res.data as { id: string }).id}`);
    });
  }
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {!task && projects && (
        <Field label="Project" htmlFor="projectId" error={errors.projectId}><select id="projectId" name="projectId" defaultValue={projectId ?? projects[0]?.id} className={selectCls}>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}</select></Field>
      )}
      {!task && !projects && <input type="hidden" name="projectId" value={projectId} />}
      <Field label="Title" htmlFor="title" error={errors.title}><input id="title" name="title" defaultValue={task?.title} className={inputCls} /></Field>
      <Field label="Description" htmlFor="description" optional error={errors.description}><textarea id="description" name="description" rows={4} defaultValue={task?.description ?? ""} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="status"><select id="status" name="status" defaultValue={task?.status ?? "todo"} className={selectCls}>{["backlog", "todo", "in_progress", "in_review", "blocked", "done"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></Field>
        <Field label="Priority" htmlFor="priority"><select id="priority" name="priority" defaultValue={task?.priority ?? "medium"} className={selectCls}>{["low", "medium", "high", "urgent"].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="Assignee" htmlFor="assigneeId"><select id="assigneeId" name="assigneeId" defaultValue={task?.assigneeId ?? ""} className={selectCls}><option value="">Unassigned</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Due date" htmlFor="dueDate" optional><input id="dueDate" name="dueDate" type="date" defaultValue={task?.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
        {milestones && <Field label="Milestone" htmlFor="milestoneId" optional><select id="milestoneId" name="milestoneId" defaultValue={task?.milestoneId ?? ""} className={selectCls}><option value="">None</option>{milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></Field>}
        <Field label="Labels" htmlFor="labels" optional hint="Comma separated"><input id="labels" name="labels" defaultValue={task?.labels ? (JSON.parse(task.labels) as string[]).join(", ") : ""} className={inputCls} /></Field>
      </div>
      <label className="flex items-center gap-2 text-[0.8125rem] text-bone-200"><input type="checkbox" name="clientVisible" defaultChecked={task?.clientVisible ?? false} className="accent-forge-500" /> Visible to the client</label>
      {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">{onDone && <AppButton variant="ghost" onClick={onDone}>Cancel</AppButton>}<AppButton type="submit" disabled={pending}>{pending ? "Saving…" : task ? "Save task" : "Create task"}</AppButton></div>
    </form>
  );
}
