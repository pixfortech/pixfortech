import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { listMilestones, listProjects, projectStats } from "@/server/services/projects";
import { listRequests, requestStats } from "@/server/services/requests";
import { listTasks, taskStats } from "@/server/services/tasks";
import { listApprovals } from "@/server/services/approvals";
import { listConversations } from "@/server/services/messages";
import { listActivity } from "@/server/services/activity";
import { unreadCount } from "@/server/services/notifications";
import { accessibleProjectIds } from "@/server/services/access";
import { listTeam } from "@/server/services/directory";
import { AppButton, Avatar, Badge, Card, CardHeader, PageTitle, Progress, ProjectMark, Stat, fmtDate, humanise, statusTone, timeAgo } from "@/components/app/primitives";
import { RequestList, TaskList } from "@/components/workspace/lists";
import { LiveActivity } from "@/components/workspace/LiveActivity";
import { copy } from "@content/microcopy";

export default async function AdminHome() {
  const user = await requirePageUser("/admin");
  const [pStats, rStats, tStats, projects, requests, tasks, approvals, conversations, ids, team, unreadNotifications] = await Promise.all([
    projectStats(user), requestStats(user), taskStats(user), listProjects(user), listRequests(user, { open: true }), listTasks(user), listApprovals(user, { status: "pending" }), listConversations(user), accessibleProjectIds(user), listTeam(user), unreadCount(user.id),
  ]);
  const activity = await listActivity(user, { projectIds: ids, limit: 10 });
  const { myTasks, dueSoon, overdue, blocked, now } = deriveTasks(tasks, user.id);
  const unreadMessages = conversations.reduce((n, c) => n + c.unread, 0);
  const needsClient = requests.filter((r) => ["needs_clarification", "ready_for_review"].includes(r.status));
  const newRequests = requests.filter((r) => r.status === "submitted");
  const active = projects.filter((p) => !["completed", "on_hold", "lead"].includes(p.status));
  const pulse = await Promise.all(active.slice(0, 6).map(async (p) => {
    const [milestones, latest] = await Promise.all([listMilestones(user, p.id), listActivity(user, { projectIds: [p.id], projectId: p.id, limit: 1 })]);
    const next = milestones.filter((m) => m.status !== "completed").sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))[0] ?? null;
    return { ...p, next, latest: latest[0] ?? null };
  }));

  // Attention queue: the things that get worse if nobody looks. Highest urgency first.
  type Item = { key: string; score: number; tone: "bad" | "warn" | "hot" | "neutral"; label: string; title: string; href: string; meta: string };
  const queue: Item[] = [];
  for (const t of overdue) queue.push({ key: `t-${t.id}`, score: 100 + Math.min(30, Math.floor((now - t.dueDate!.getTime()) / 86400000)), tone: "bad", label: "Overdue", title: t.title, href: `/admin/tasks/${t.id}`, meta: `${t.projectCode} · due ${fmtDate(t.dueDate)}` });
  for (const t of blocked) queue.push({ key: `b-${t.id}`, score: 80, tone: "warn", label: "Blocked", title: t.title, href: `/admin/tasks/${t.id}`, meta: t.projectCode });
  for (const r of newRequests) queue.push({ key: `r-${r.id}`, score: r.priority === "urgent" ? 95 : r.priority === "high" ? 75 : 60, tone: "hot", label: r.priority === "urgent" ? "Urgent request" : "New request", title: r.title, href: `/admin/requests/${r.id}`, meta: `${r.ref} · ${timeAgo(r.createdAt)}` });
  for (const p of projects.filter((p) => p.health !== "on_track" && !["completed", "on_hold"].includes(p.status))) queue.push({ key: `p-${p.id}`, score: p.health === "delayed" ? 85 : 65, tone: p.health === "delayed" ? "bad" : "warn", label: humanise(p.health), title: `${p.code} · ${p.title}`, href: `/admin/projects/${p.id}`, meta: p.targetDate ? `target ${fmtDate(p.targetDate)}` : humanise(p.status) });
  for (const c of conversations.filter((c) => c.unread > 0)) queue.push({ key: `c-${c.id}`, score: 55, tone: "hot", label: "Unanswered", title: c.title, href: `/admin/projects/${c.projectId}/messages`, meta: `${c.unread} unread` });
  for (const a of approvals) queue.push({ key: `a-${a.id}`, score: 45 + Math.min(20, Math.floor((now - a.createdAt.getTime()) / 86400000) * 4), tone: "neutral", label: "Awaiting client", title: a.title, href: `/admin/projects/${a.projectId}/approvals`, meta: `requested ${timeAgo(a.createdAt)}` });
  for (const r of needsClient) queue.push({ key: `q-${r.id}`, score: 40, tone: "neutral", label: "Awaiting client", title: r.title, href: `/admin/requests/${r.id}`, meta: r.ref });
  queue.sort((a, b) => b.score - a.score);

  return (
    <div>
      <PageTitle eyebrow="Admin" title={copy.admin.greeting(user.name.split(" ")[0])} description={copy.admin.greetingLead} actions={<><AppButton href="/admin/projects/new">New project</AppButton><AppButton variant="secondary" href="/admin/requests">Triage requests</AppButton></>} />

      <section aria-label="Live overview" className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5" data-testid="live-overview">
        <Stat label="Active projects" value={pStats.active} hint={`${pStats.total} total`} href="/admin/projects" />
        <Stat label="At risk" value={pStats.atRisk + pStats.delayed} tone={pStats.atRisk + pStats.delayed ? "warn" : "default"} hint={`${pStats.delayed} delayed`} href="/admin/projects" />
        <Stat label="Awaiting client" value={pStats.awaitingClient + needsClient.length + approvals.length} hint={`${approvals.length} approvals`} href="/admin/requests" />
        <Stat label="Due today" value={tStats.dueToday} tone={tStats.dueToday ? "hot" : "default"} href="/admin/tasks?due=today" />
        <Stat label="Overdue" value={tStats.overdue} tone={tStats.overdue ? "warn" : "default"} href="/admin/tasks?due=overdue" />
        <Stat label="Open requests" value={requests.length} hint={`${rStats.new} new`} href="/admin/requests" />
        <Stat label="Approvals pending" value={approvals.length} href="/admin/projects" />
        <Stat label="Unread messages" value={unreadMessages} tone={unreadMessages ? "hot" : "default"} href="/admin/messages" />
        <Stat label="Unread notifications" value={unreadNotifications} tone={unreadNotifications ? "hot" : "default"} href="/admin/notifications" />
        <Stat label="Blocked" value={tStats.blocked} tone={tStats.blocked ? "warn" : "default"} href="/admin/tasks?status=blocked" />
      </section>

      <section aria-label={copy.admin.quickTitle} className="mt-6 flex flex-wrap gap-2" data-testid="quick-actions">
        <AppButton size="sm" variant="secondary" href="/admin/projects/new">Create project</AppButton>
        <AppButton size="sm" variant="secondary" href="/admin/clients">Add client</AppButton>
        <AppButton size="sm" variant="secondary" href="/admin/tasks/new">New task</AppButton>
        <AppButton size="sm" variant="secondary" href="/admin/messages">Send update</AppButton>
        <AppButton size="sm" variant="secondary" href="/admin/team">Invite member</AppButton>
        <AppButton size="sm" variant="secondary" href="/admin/requests/new">Open request</AppButton>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader title={copy.admin.attentionTitle} description={copy.admin.attentionBody} action={<span className="num text-[0.75rem] text-bone-400">{queue.length}</span>} />
            {queue.length === 0 ? (
              <p className="px-5 pb-5 text-[0.8125rem] text-bone-400">{copy.admin.attentionEmpty}</p>
            ) : (
              <ul className="divide-y divide-line-faint px-5 pb-3" data-testid="attention-queue">
                {queue.slice(0, 8).map((q) => (
                  <li key={q.key}>
                    <Link href={q.href} className="flex items-center gap-3 py-2.5 text-[0.875rem] hover:text-forge-300">
                      <Badge tone={q.tone === "neutral" ? "muted" : q.tone} dot className="w-[7.5rem] justify-center">{q.label}</Badge>
                      <span className="min-w-0 flex-1 truncate text-bone-50">{q.title}</span>
                      <span className="num hidden shrink-0 text-[0.75rem] text-bone-400 sm:inline">{q.meta}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section aria-labelledby="pulse-title">
            <div className="mb-3 flex items-center justify-between"><h2 id="pulse-title" className="text-[0.9375rem] font-semibold">{copy.admin.pulseTitle}</h2><Link href="/admin/projects" className="text-[0.75rem] text-forge-300">All projects</Link></div>
            {pulse.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-[0.8125rem] text-bone-400">{copy.empty.projects.title}. {copy.empty.projects.body}</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2" data-testid="project-pulse">
                {pulse.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/projects/${p.id}`} className="block h-full rounded-lg border border-line bg-ink-850/70 p-4 transition-colors hover:border-line-strong">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2"><ProjectMark theme={p.pixelTheme} size={18} /><span className="truncate text-[0.875rem] font-medium text-bone-50">{p.title}</span></div>
                        <Badge tone={p.health === "on_track" ? "good" : p.health === "at_risk" ? "warn" : "bad"} dot>{humanise(p.health)}</Badge>
                      </div>
                      <p className="num mt-1 text-[0.6875rem] text-bone-400">{p.code} · {p.organisationName}</p>
                      <div className="mt-3"><Progress value={p.progress} tone={p.health === "on_track" ? "hot" : "cool"} label={`${p.progress}% complete`} /></div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.75rem]">
                        <dt className="text-bone-400">Phase</dt><dd className="truncate text-bone-50">{p.phase ?? humanise(p.status)}</dd>
                        <dt className="text-bone-400">Next milestone</dt><dd className="truncate text-bone-50">{p.next ? `${p.next.title}${p.next.dueDate ? ` · ${fmtDate(p.next.dueDate)}` : ""}` : "None set"}</dd>
                        <dt className="text-bone-400">Target</dt><dd className="text-bone-50">{p.targetDate ? fmtDate(p.targetDate, true) : "Open"}</dd>
                        <dt className="text-bone-400">Latest</dt><dd className="truncate text-bone-50">{p.latest ? `${p.latest.summary} · ${timeAgo(p.latest.createdAt)}` : `updated ${timeAgo(p.updatedAt)}`}</dd>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">New and waiting requests</h2><Link href="/admin/requests" className="text-[0.75rem] text-forge-300">All requests</Link></div><RequestList requests={[...newRequests, ...needsClient].slice(0, 6)} area="admin" emptyTitle={copy.admin.inboxZero} emptyBody={copy.admin.inboxZeroBody} /></section>
          <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">Due in the next three days</h2><Link href="/admin/tasks?due=week" className="text-[0.75rem] text-forge-300">Due soon</Link></div><TaskList tasks={dueSoon.slice(0, 6)} area="admin" emptyTitle={copy.admin.calendarCalm} emptyBody={copy.admin.calendarCalmBody} /></section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          <Card><CardHeader title={copy.admin.liveTitle} description={copy.admin.liveBody} /><div className="px-5 pb-5"><LiveActivity items={activity} area="admin" /></div></Card>
          <Card><CardHeader title="My tasks" action={<Link href="/admin/tasks?assignee=me" className="text-[0.75rem] text-forge-300">All</Link>} /><div className="px-5 pb-5">{myTasks.length === 0 ? <p className="text-[0.8125rem] text-bone-400">{copy.admin.myTasksEmpty}</p> : <ul className="flex flex-col gap-1.5">{myTasks.slice(0, 6).map((t) => <li key={t.id}><Link href={`/admin/tasks/${t.id}`} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-[0.8125rem] hover:border-bone-50"><span className="truncate">{t.title}</span><Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge></Link></li>)}</ul>}</div></Card>
          <Card><CardHeader title={copy.admin.workloadTitle} description={copy.admin.workloadBody} action={<Link href="/admin/team" className="text-[0.75rem] text-forge-300">Team</Link>} />
            <ul className="px-5 pb-5">{team.map((m) => <li key={m.id} className="flex items-center gap-3 border-b border-line-faint py-2 text-[0.8125rem] last:border-0"><Avatar name={m.name} image={m.image} size={22} /><span className="min-w-0 flex-1 truncate text-bone-50">{m.name}</span><span className="num text-bone-400" title="Open tasks">{m.openTasks} tasks</span><span className="num text-bone-400" title="Open requests">{m.openRequests} req</span><span className="h-1.5 w-16 overflow-hidden rounded-pill bg-ink-700" aria-hidden="true"><span className={`block h-full ${m.openTasks + m.openRequests > 6 ? "bg-[#f0b35a]" : "bg-forge-500"}`} style={{ width: `${Math.min(100, (m.openTasks + m.openRequests) * 12)}%` }} /></span></li>)}</ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function deriveTasks<T extends { assigneeId: string | null; status: string; dueDate: Date | null }>(tasks: T[], userId: string) {
  const now = Date.now();
  const open = tasks.filter((t) => t.status !== "done");
  const myTasks = open.filter((t) => t.assigneeId === userId).sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
  const dueSoon = open.filter((t) => t.dueDate && t.dueDate.getTime() >= now && t.dueDate.getTime() < now + 3 * 86400000).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  const overdue = open.filter((t) => t.dueDate && t.dueDate.getTime() < now).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  const blocked = open.filter((t) => t.status === "blocked");
  return { myTasks, dueSoon, overdue, blocked, now };
}
