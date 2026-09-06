"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRequestAction } from "@/server/actions/requests";
import { AppButton, Field, inputCls, selectCls } from "@/components/app/primitives";
import { FileDropzone } from "./FileDropzone";
import { useRealtime } from "@/components/app/RealtimeProvider";

const TYPES = [["edit", "Edit"], ["bug", "Bug"], ["feature", "New feature"], ["design", "Design change"], ["content", "Content change"], ["integration", "Integration"], ["performance", "Performance"], ["other", "Other"]];

export function RequestForm({ projects, area, defaultProjectId }: { projects: { id: string; title: string; code: string }[]; area: "portal" | "admin"; defaultProjectId?: string }) {
  const router = useRouter();
  const { toast } = useRealtime();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    setErrors({}); setError(null);
    start(async () => {
      const res = await createRequestAction(payload);
      if (!res.ok) { setError(res.error); setErrors(res.fieldErrors ?? {}); return; }
      const { id, ref } = res.data!;
      if (files.length) {
        const up = new FormData();
        up.set("projectId", String(payload.projectId)); up.set("requestId", id);
        for (const f of files) up.append("files", f);
        const r = await fetch("/api/upload", { method: "POST", body: up });
        if (!r.ok) toast({ title: "Request sent, but attachments failed", body: "You can add them from the request page.", kind: "error" });
      }
      toast({ title: `${ref} submitted`, body: "The team has been notified.", kind: "success" });
      router.push(`/${area}/requests/${id}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Project" htmlFor="projectId" error={errors.projectId}>
          <select id="projectId" name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
          </select>
        </Field>
        <Field label="Request type" htmlFor="type" error={errors.type}>
          <select id="type" name="type" defaultValue="edit" className={selectCls}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
      </div>
      <Field label="Title" htmlFor="title" error={errors.title} hint="One line that says what should change."><input id="title" name="title" maxLength={160} className={inputCls} placeholder="Move the mobile navigation CTA above the menu items" /></Field>
      <Field label="Description" htmlFor="description" error={errors.description} hint="What you see today, what you want instead, and where. Screenshots help enormously."><textarea id="description" name="description" rows={5} className={inputCls} /></Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Area affected" htmlFor="area" optional error={errors.area}><input id="area" name="area" className={inputCls} placeholder="Product page, header…" /></Field>
        <Field label="Priority" htmlFor="priority" error={errors.priority}>
          <select id="priority" name="priority" defaultValue="medium" className={selectCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
        </Field>
        <Field label="Desired date" htmlFor="desiredDate" optional error={errors.desiredDate}><input id="desiredDate" name="desiredDate" type="date" className={inputCls} /></Field>
      </div>
      <Field label="Business reason or desired outcome" htmlFor="reason" optional error={errors.reason}><textarea id="reason" name="reason" rows={2} className={inputCls} placeholder="Why this matters, so we can suggest the best fix." /></Field>
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-medium text-bone-50">Screenshots or files <span className="text-[0.6875rem] font-normal text-bone-600">Optional</span></p>
        <FileDropzone files={files} onChange={setFiles} />
      </div>
      {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <AppButton variant="ghost" onClick={() => router.back()}>Cancel</AppButton>
        <AppButton type="submit" disabled={pending || !projectId}>{pending ? "Submitting…" : "Submit request"}</AppButton>
      </div>
    </form>
  );
}
