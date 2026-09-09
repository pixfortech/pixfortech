"use client";

import { useModalDone } from "./ModalButton";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProjectAction, updateProjectAction, setProjectMembersAction } from "@/server/actions/projects";
import { createClientAction, updateClientAction, inviteUserAction, updateUserAction, updateProfileAction, savePreferencesAction } from "@/server/actions/collab";
import { AppButton, Field, humanise, inputCls, selectCls } from "@/components/app/primitives";
import { useRealtime } from "@/components/app/RealtimeProvider";
import { useHydrated } from "@/lib/useHydrated";

type Opt = { id: string; name: string };
const STATUSES = ["lead", "discovery", "planning", "design", "development", "internal_qa", "client_review", "changes_requested", "final_qa", "deployment", "maintenance", "completed", "on_hold"];

type AnyResult = { ok: boolean; error?: string; fieldErrors?: Record<string, string>; data?: unknown };
function useSubmit<T = unknown>(fn: (payload: Record<string, unknown>) => Promise<AnyResult>, after?: (data?: T) => void) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = (e: React.FormEvent<HTMLFormElement>, transform?: (fd: FormData) => Record<string, unknown>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = transform ? transform(fd) : (Object.fromEntries(fd.entries()) as Record<string, unknown>);
    start(async () => {
      setError(null); setErrors({});
      const res = await fn(payload);
      if (!res.ok) { setError(res.error ?? "Failed"); setErrors(res.fieldErrors ?? {}); return; }
      router.refresh(); after?.(res.data as T | undefined);
    });
  };
  return { submit, pending, error, errors };
}

export function ProjectForm({ clients, managers, project, workflow, onDone: onDoneProp }: { clients: Opt[]; managers: Opt[]; project?: { id: string; title: string; summary: string | null; status: string; priority: string; health: string; progress: number; managerId: string | null; startDate: Date | null; targetDate: Date | null; phase: string | null; organisationId: string }; workflow?: string[]; onDone?: () => void }) {
  const modalDone = useModalDone();
  const onDone = onDoneProp ?? modalDone ?? undefined;
  const router = useRouter();
  const s = useSubmit<{ id: string }>((p) => (project ? updateProjectAction({ ...p, id: project.id }) : createProjectAction(p)), (d) => { onDone?.(); if (!project && d) router.push(`/admin/projects/${d.id}`); });
  const statuses = workflow ?? STATUSES;
  return (
    <form onSubmit={(e) => s.submit(e)} className="grid gap-4" noValidate>
      {!project && <Field label="Client" htmlFor="pf-org" error={s.errors.organisationId}><select id="pf-org" name="organisationId" className={selectCls} defaultValue={clients[0]?.id}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
      <Field label="Title" htmlFor="pf-title" error={s.errors.title}><input id="pf-title" name="title" defaultValue={project?.title} className={inputCls} /></Field>
      <Field label="Summary" htmlFor="pf-summary" optional error={s.errors.summary}><textarea id="pf-summary" name="summary" rows={3} defaultValue={project?.summary ?? ""} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="pf-status"><select id="pf-status" name="status" defaultValue={project?.status ?? "planning"} className={selectCls}>{statuses.map((st) => <option key={st} value={st}>{humanise(st)}</option>)}</select></Field>
        <Field label="Priority" htmlFor="pf-priority"><select id="pf-priority" name="priority" defaultValue={project?.priority ?? "medium"} className={selectCls}>{["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{humanise(p)}</option>)}</select></Field>
        {project && <Field label="Health" htmlFor="pf-health"><select id="pf-health" name="health" defaultValue={project.health} className={selectCls}>{["on_track", "at_risk", "delayed"].map((p) => <option key={p} value={p}>{humanise(p)}</option>)}</select></Field>}
        {project && <Field label="Progress %" htmlFor="pf-progress"><input id="pf-progress" name="progress" type="number" min={0} max={100} defaultValue={project.progress} className={inputCls} /></Field>}
        <Field label="Project manager" htmlFor="pf-manager"><select id="pf-manager" name="managerId" defaultValue={project?.managerId ?? ""} className={selectCls}><option value="">Unassigned</option>{managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Current phase" htmlFor="pf-phase" optional><input id="pf-phase" name="phase" defaultValue={project?.phase ?? ""} placeholder="Build sprint 2" className={inputCls} /></Field>
        <Field label="Start date" htmlFor="pf-start" optional><input id="pf-start" name="startDate" type="date" defaultValue={project?.startDate ? project.startDate.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
        <Field label="Target date" htmlFor="pf-target" optional><input id="pf-target" name="targetDate" type="date" defaultValue={project?.targetDate ? project.targetDate.toISOString().slice(0, 10) : ""} className={inputCls} /></Field>
      </div>
      {s.error && <p role="alert" className="text-[0.8125rem] text-forge-300">{s.error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">{onDone && <AppButton variant="ghost" onClick={onDone}>Cancel</AppButton>}<AppButton type="submit" disabled={s.pending}>{s.pending ? "Saving…" : project ? "Save project" : "Create project"}</AppButton></div>
    </form>
  );
}

export function WorkflowForm({ projectId, workflow }: { projectId: string; workflow: string[] }) {
  const s = useSubmit((p) => updateProjectAction({ id: projectId, workflow: String(p.workflow).split("\n").map((x) => x.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")).filter(Boolean) }));
  return (
    <form onSubmit={(e) => s.submit(e)} className="grid gap-3" noValidate>
      <Field label="Workflow states, one per line" htmlFor="wf" hint="Order matters. Leave the defaults if the standard pipeline fits."><textarea id="wf" name="workflow" rows={8} defaultValue={workflow.join("\n")} className={inputCls} /></Field>
      {s.error && <p role="alert" className="text-[0.8125rem] text-forge-300">{s.error}</p>}
      <div className="flex justify-end"><AppButton size="sm" type="submit" variant="secondary" disabled={s.pending}>Save workflow</AppButton></div>
    </form>
  );
}

export function MembersForm({ projectId, people, current }: { projectId: string; people: { id: string; name: string; role: string; organisationId: string | null }[]; current: { id: string; projectRole: string }[] }) {
  const s = useSubmit((p) => setProjectMembersAction(p));
  const staffRoles = ["super_admin", "admin", "project_manager", "team_member"];
  return (
    <form onSubmit={(e) => s.submit(e, (fd) => ({ projectId, members: people.filter((u) => fd.get(`m-${u.id}`) === "on").map((u) => ({ userId: u.id, role: staffRoles.includes(u.role) ? (u.role === "project_manager" ? "manager" : "member") : "client" })) }))} className="grid gap-3" noValidate>
      <ul className="grid gap-1 sm:grid-cols-2">
        {people.map((u) => (
          <li key={u.id}><label className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-[0.8125rem]"><input type="checkbox" name={`m-${u.id}`} defaultChecked={current.some((c) => c.id === u.id)} className="accent-forge-500" /><span className="flex-1 text-bone-50">{u.name}</span><span className="text-[0.6875rem] uppercase tracking-[0.06em] text-bone-400">{staffRoles.includes(u.role) ? humanise(u.role) : "Client"}</span></label></li>
        ))}
      </ul>
      {s.error && <p role="alert" className="text-[0.8125rem] text-forge-300">{s.error}</p>}
      <div className="flex justify-end"><AppButton size="sm" type="submit" disabled={s.pending}>{s.pending ? "Saving…" : "Save team"}</AppButton></div>
    </form>
  );
}

export function ClientForm({ client, onDone: onDoneProp }: { client?: { id: string; name: string; website: string | null; industry: string | null; notes: string | null }; onDone?: () => void }) {
  const modalDone = useModalDone();
  const onDone = onDoneProp ?? modalDone ?? undefined;
  const router = useRouter();
  const s = useSubmit<string>((p) => (client ? updateClientAction({ ...p, id: client.id }) : createClientAction(p)), (id) => { onDone?.(); if (!client && id) router.push(`/admin/clients/${id}`); });
  return (
    <form onSubmit={(e) => s.submit(e)} className="grid gap-4" noValidate>
      <Field label="Company name" htmlFor="cl-name" error={s.errors.name}><input id="cl-name" name="name" defaultValue={client?.name} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website" htmlFor="cl-web" optional><input id="cl-web" name="website" defaultValue={client?.website ?? ""} className={inputCls} placeholder="https://" /></Field>
        <Field label="Industry" htmlFor="cl-ind" optional><input id="cl-ind" name="industry" defaultValue={client?.industry ?? ""} className={inputCls} /></Field>
      </div>
      <Field label="Internal notes" htmlFor="cl-notes" optional hint="Never shown to the client."><textarea id="cl-notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className={inputCls} /></Field>
      {s.error && <p role="alert" className="text-[0.8125rem] text-forge-300">{s.error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">{onDone && <AppButton variant="ghost" onClick={onDone}>Cancel</AppButton>}<AppButton type="submit" disabled={s.pending}>{s.pending ? "Saving…" : client ? "Save client" : "Add client"}</AppButton></div>
    </form>
  );
}

export function InviteForm({ organisations, roles, defaultOrganisationId, onDone: onDoneProp }: { organisations: Opt[]; roles: string[]; defaultOrganisationId?: string; onDone?: () => void }) {
  const modalDone = useModalDone();
  const onDone = onDoneProp ?? modalDone ?? undefined;
  const { toast } = useRealtime();
  const s = useSubmit<{ id: string; emailed: boolean }>((p) => inviteUserAction(p), (d) => {
    if (d?.emailed === false) toast({ title: "Account created, email not sent", body: "No email transport is configured. Send them a reset link from the sign-in page once email is set up.", kind: "error" });
    else toast({ title: "Invitation sent", body: "They will receive an email to set a password.", kind: "success" });
    onDone?.();
  });
  const clientRoles = roles.filter((r) => r.startsWith("client"));
  return (
    <form onSubmit={(e) => s.submit(e)} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="inv-name" error={s.errors.name}><input id="inv-name" name="name" className={inputCls} /></Field>
        <Field label="Email" htmlFor="inv-email" error={s.errors.email}><input id="inv-email" name="email" type="email" className={inputCls} /></Field>
        <Field label="Role" htmlFor="inv-role" error={s.errors.role}><select id="inv-role" name="role" defaultValue={roles[0]} className={selectCls}>{roles.map((r) => <option key={r} value={r}>{humanise(r)}</option>)}</select></Field>
        {clientRoles.length > 0 && organisations.length > 0 && <Field label="Client organisation" htmlFor="inv-org" hint="Only used for client roles."><select id="inv-org" name="organisationId" defaultValue={defaultOrganisationId ?? organisations[0]?.id} className={selectCls}>{organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
        {defaultOrganisationId && organisations.length === 0 && <input type="hidden" name="organisationId" value={defaultOrganisationId} />}
        <Field label="Job title" htmlFor="inv-title" optional><input id="inv-title" name="title" className={inputCls} /></Field>
      </div>
      {s.error && <p role="alert" className="text-[0.8125rem] text-forge-300">{s.error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">{onDone && <AppButton variant="ghost" onClick={onDone}>Cancel</AppButton>}<AppButton type="submit" disabled={s.pending}>{s.pending ? "Sending…" : "Send invitation"}</AppButton></div>
    </form>
  );
}

export function UserRow({ user, roles, canEdit }: { user: { id: string; name: string; email: string; role: string; title: string | null; disabled: boolean }; roles: string[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const change = (patch: { role?: string; disabled?: boolean }) => start(async () => { const res = await updateUserAction({ id: user.id, ...patch } as Parameters<typeof updateUserAction>[0]); if (!res.ok) setError(res.error); else router.refresh(); });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? <select value={user.role} onChange={(e) => change({ role: e.target.value })} disabled={pending} aria-label={`Role for ${user.name}`} className={selectCls + " !w-auto !py-1 text-[0.75rem]"}>{roles.map((r) => <option key={r} value={r}>{humanise(r)}</option>)}</select> : <span className="text-[0.75rem] text-bone-400">{humanise(user.role)}</span>}
      {canEdit && <AppButton size="sm" variant={user.disabled ? "secondary" : "ghost"} disabled={pending} onClick={() => change({ disabled: !user.disabled })}>{user.disabled ? "Re-enable" : "Disable"}</AppButton>}
      {error && <span className="text-[0.75rem] text-forge-300">{error}</span>}
    </div>
  );
}

export function ProfileForm({ user }: { user: { name: string; title: string | null; timezone: string | null; email: string } }) {
  const { toast } = useRealtime();
  const s = useSubmit((p) => updateProfileAction(p), () => toast({ title: "Profile saved", kind: "success" }));
  return (
    <form onSubmit={(e) => s.submit(e)} className="grid gap-4" noValidate>
      <Field label="Name" htmlFor="pr-name" error={s.errors.name}><input id="pr-name" name="name" defaultValue={user.name} className={inputCls} /></Field>
      <Field label="Email" htmlFor="pr-email" hint="Contact us to change the email on the account."><input id="pr-email" value={user.email} disabled className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" htmlFor="pr-title" optional><input id="pr-title" name="title" defaultValue={user.title ?? ""} className={inputCls} /></Field>
        <Field label="Timezone" htmlFor="pr-tz" optional><input id="pr-tz" name="timezone" defaultValue={user.timezone ?? ""} placeholder="Europe/London" className={inputCls} /></Field>
      </div>
      {s.error && <p role="alert" className="text-[0.8125rem] text-forge-300">{s.error}</p>}
      <div className="flex justify-end"><AppButton type="submit" disabled={s.pending}>{s.pending ? "Saving…" : "Save profile"}</AppButton></div>
    </form>
  );
}

export function PasswordForm() {
  const hydrated = useHydrated();
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(null); const { authClient } = await import("@/lib/auth/client"); const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true }); setBusy(false); setMsg(res.error ? "The current password is wrong or the new one is too short (10+ characters)." : "Password changed. Other sessions were signed out."); if (!res.error) { setCurrent(""); setNext(""); } }} className="grid gap-4" noValidate>
      <Field label="Current password" htmlFor="pw-cur"><input id="pw-cur" type="password" autoComplete="current-password" disabled={!hydrated} value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} /></Field>
      <Field label="New password" htmlFor="pw-new" hint="At least ten characters."><input id="pw-new" type="password" autoComplete="new-password" disabled={!hydrated} value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} /></Field>
      {msg && <p className="text-[0.8125rem] text-bone-200">{msg}</p>}
      <div className="flex justify-end"><AppButton type="submit" variant="secondary" disabled={busy || !current || next.length < 10}>{busy ? "Saving…" : "Change password"}</AppButton></div>
    </form>
  );
}

export function PreferencesForm({ prefs, browserOptIn, categories }: { prefs: Record<string, { inApp: boolean; email: boolean; browser: boolean }>; browserOptIn: boolean; categories: { key: string; label: string; hint: string }[] }) {
  const { toast } = useRealtime();
  const [state, setState] = useState(prefs);
  const [browser, setBrowser] = useState(browserOptIn);
  const [pending, start] = useTransition();
  const [permission, setPermission] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const toggle = (k: string, f: "inApp" | "email" | "browser") => setState((s) => ({ ...s, [k]: { ...s[k], [f]: !s[k][f] } }));
  const enableBrowser = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") setBrowser(true);
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const res = await savePreferencesAction({ prefs: state, browserOptIn: browser }); toast({ title: res.ok ? "Preferences saved" : "Could not save", kind: res.ok ? "success" : "error" }); }); }} className="grid gap-5" noValidate>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[32rem] text-[0.8125rem]">
          <thead><tr className="border-b border-line text-left text-[0.6875rem] uppercase tracking-[0.08em] text-bone-400"><th className="px-4 py-2">Event</th><th className="px-3 py-2 text-center">In-app</th><th className="px-3 py-2 text-center">Email</th><th className="px-3 py-2 text-center">Browser</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.key} className="border-b border-line-faint last:border-0">
                <td className="px-4 py-2.5"><p className="font-medium text-bone-50">{c.label}</p><p className="text-[0.75rem] text-bone-400">{c.hint}</p></td>
                {(["inApp", "email", "browser"] as const).map((f) => <td key={f} className="px-3 py-2.5 text-center"><input type="checkbox" checked={state[c.key]?.[f] ?? false} onChange={() => toggle(c.key, f)} disabled={f === "browser" && !browser} aria-label={`${c.label} ${f}`} className="accent-forge-500" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-line p-4 text-[0.8125rem]">
        <p className="font-medium text-bone-50">Browser notifications</p>
        <p className="mt-1 text-bone-400">Shown by your browser when this tab is in the background. We only ask for permission when you switch this on.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {permission === "unsupported" && <span className="text-bone-600">Not supported in this browser.</span>}
          {permission === "denied" && <span className="text-bone-600">Blocked in your browser settings. We will not ask again.</span>}
          {permission === "default" && <AppButton size="sm" variant="secondary" onClick={enableBrowser}>Enable browser notifications</AppButton>}
          {permission === "granted" && <label className="flex items-center gap-2"><input type="checkbox" checked={browser} onChange={(e) => setBrowser(e.target.checked)} className="accent-forge-500" /> Send browser notifications</label>}
        </div>
      </div>
      <div className="flex justify-end"><AppButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</AppButton></div>
    </form>
  );
}
