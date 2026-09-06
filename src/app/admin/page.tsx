import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { listProjects, projectStats } from "@/server/services/projects";
import { listRequests, requestStats } from "@/server/services/requests";
import { listTasks, taskStats } from "@/server/services/tasks";
import { listApprovals } from "@/server/services/approvals";
import { listConversations } from "@/server/services/messages";
import { listActivity } from "@/server/services/activity";
import { accessibleProjectIds } from "@/server/services/access";
import { listTeam } from "@/server/services/directory";
import { AppButton, Avatar, Badge, Card, CardHeader, PageTitle, Stat, humanise, statusTone } from "@/components/app/primitives";
import { RequestList, TaskList, ProjectTable } from "@/components/workspace/lists";
import { ActivityFeed } from "@/components/workspace/ActivityFeed";

export default async function AdminHome() {
  const user = await requirePageUser("/admin");
  const [pStats, rStats, tStats, projects, requests, tasks, approvals, conversations, ids, team] = await Promise.all([
    projectStats(user), requestStats(user), taskStats(user), listProjects(user), listRequests(user, { open: true }), listTasks(user), listApprovals(user, { status: "pending" }), listConversations(user), accessibleProjectIds(user), listTeam(user),
  ]);
  const activity = listActivity(user, { projectIds: ids, limit: 12 });
  const { myTasks, dueSoon } = deriveTasks(tasks, user.id);
  const unread = conversations.reduce((n, c) => n + c.unread, 0);
  const needsClient = requests.filter((r) => ["needs_clarification", "ready_for_review"].includes(r.status));
  const attention = projects.filter((p) => p.health !== "on_track" && !["completed", "on_hold"].includes(p.status));

  return (
    <div>
      <PageTitle eyebrow="Admin" title={`Welcome back, ${user.name.split(" ")[0]}.`} description="The state of the forge right now." actions={<><AppButton href="/admin/projects/new">New project</AppButton><AppButton variant="secondary" href="/admin/requests">Triage requests</AppButton></>} />

      <section aria-label="Projects" className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Projects" value={pStats.total} hint={`${pStats.completed} completed`} href="/admin/projects" />
        <Stat label="Active" value={pStats.active} href="/admin/projects" />
        <Stat label="Planning" value={pStats.planning} href="/admin/projects?status=planning" />
        <Stat label="Awaiting client" value={pStats.awaitingClient} tone={pStats.awaitingClient ? "warn" : "default"} href="/admin/projects?status=client_review" />
        <Stat label="Delayed" value={pStats.delayed} tone={pStats.delayed ? "warn" : "default"} hint={`${pStats.atRisk} at risk`} />
        <Stat label="On hold" value={pStats.onHold} href="/admin/projects?status=on_hold" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card><CardHeader title="Tasks" action={<Link href="/admin/tasks" className="text-[0.75rem] text-forge-300">Board</Link>} />
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4"><Cell label="Due today" value={tStats.dueToday} /><Cell label="Overdue" value={tStats.overdue} tone={tStats.overdue ? "bad" : undefined} /><Cell label="Upcoming" value={tStats.upcoming} /><Cell label="Blocked" value={tStats.blocked} tone={tStats.blocked ? "warn" : undefined} /></dl>
        </Card>
        <Card><CardHeader title="Client actions" action={<Link href="/admin/requests" className="text-[0.75rem] text-forge-300">Requests</Link>} />
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4"><Cell label="Approvals pending" value={approvals.length} tone={approvals.length ? "warn" : undefined} /><Cell label="Waiting on client" value={needsClient.length} /><Cell label="Unanswered" value={rStats.new} tone={rStats.new ? "hot" : undefined} /><Cell label="Unread msgs" value={unread} tone={unread ? "hot" : undefined} /></dl>
        </Card>
        <Card><CardHeader title="Requests pipeline" action={<Link href="/admin/requests" className="text-[0.75rem] text-forge-300">All</Link>} />
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4"><Cell label="New" value={rStats.new} tone={rStats.new ? "hot" : undefined} /><Cell label="Reviewing" value={rStats.reviewing} /><Cell label="Approved" value={rStats.approved} /><Cell label="In dev" value={rStats.inDevelopment} /></dl>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {attention.length > 0 && (
            <Card className="border-[#f0b35a]/40"><CardHeader title="Projects needing attention" description="At risk or delayed. Check target dates and blockers." />
              <ul className="divide-y divide-line-faint px-5 pb-4">{attention.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[0.875rem]"><Link href={`/admin/projects/${p.id}`} className="min-w-0 truncate text-bone-50 hover:text-forge-300">{p.code} · {p.title}</Link><span className="flex items-center gap-2"><Badge tone={p.health === "at_risk" ? "warn" : "bad"} dot>{humanise(p.health)}</Badge><Badge tone={statusTone(p.status)}>{humanise(p.status)}</Badge></span></li>)}</ul>
            </Card>
          )}
          <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">New and waiting requests</h2><Link href="/admin/requests" className="text-[0.75rem] text-forge-300">All requests</Link></div><RequestList requests={[...requests.filter((r) => r.status === "submitted"), ...needsClient].slice(0, 6)} area="admin" emptyTitle="Inbox zero" emptyBody="No new requests. Enjoy it while it lasts." /></section>
          <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">Due in the next three days</h2><Link href="/admin/tasks?due=week" className="text-[0.75rem] text-forge-300">Due soon</Link></div><TaskList tasks={dueSoon.slice(0, 6)} area="admin" emptyTitle="Nothing due imminently" emptyBody="The calendar is calm." /></section>
          <section><h2 className="mb-3 text-[0.9375rem] font-semibold">Portfolio</h2><ProjectTable projects={projects.filter((p) => !["completed"].includes(p.status)).slice(0, 8)} area="admin" /></section>
        </div>
        <aside className="flex flex-col gap-6 lg:col-span-4">
          <Card><CardHeader title="My tasks" action={<Link href="/admin/tasks?assignee=me" className="text-[0.75rem] text-forge-300">All</Link>} /><div className="px-5 pb-5">{myTasks.length === 0 ? <p className="text-[0.8125rem] text-bone-400">Nothing assigned to you. Either you are very efficient or someone forgot.</p> : <ul className="flex flex-col gap-1.5">{myTasks.slice(0, 6).map((t) => <li key={t.id}><Link href={`/admin/tasks/${t.id}`} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-[0.8125rem] hover:border-bone-50"><span className="truncate">{t.title}</span><Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge></Link></li>)}</ul>}</div></Card>
          <Card><CardHeader title="Team workload" action={<Link href="/admin/team" className="text-[0.75rem] text-forge-300">Team</Link>} />
            <ul className="px-5 pb-5">{team.map((m) => <li key={m.id} className="flex items-center gap-3 border-b border-line-faint py-2 text-[0.8125rem] last:border-0"><Avatar name={m.name} image={m.image} size={22} /><span className="min-w-0 flex-1 truncate text-bone-50">{m.name}</span><span className="num text-bone-400" title="Open tasks">{m.openTasks} tasks</span><span className="num text-bone-400" title="Open requests">{m.openRequests} req</span><span className="h-1.5 w-16 overflow-hidden rounded-pill bg-ink-700"><span className={`block h-full ${m.openTasks + m.openRequests > 6 ? "bg-[#f0b35a]" : "bg-forge-500"}`} style={{ width: `${Math.min(100, (m.openTasks + m.openRequests) * 12)}%` }} /></span></li>)}</ul>
          </Card>
          <Card><CardHeader title="Recent activity" action={<Link href="/admin/activity" className="text-[0.75rem] text-forge-300">All</Link>} /><div className="px-5 pb-5"><ActivityFeed items={activity} area="admin" showProject compact /></div></Card>
        </aside>
      </div>
    </div>
  );
}

function deriveTasks<T extends { assigneeId: string | null; status: string; dueDate: Date | null }>(tasks: T[], userId: string) {
  const now = Date.now();
  const myTasks = tasks.filter((t) => t.assigneeId === userId && t.status !== "done").sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
  const dueSoon = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate.getTime() < now + 3 * 86400000).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  return { myTasks, dueSoon };
}
function Cell({ label, value, tone }: { label: string; value: number; tone?: "bad" | "warn" | "hot" }) {
  return <div className="bg-ink-850/80 px-4 py-3"><dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-bone-400">{label}</dt><dd className={`num mt-1 text-[1.375rem] font-semibold ${tone === "bad" ? "text-[#ff9b9b]" : tone === "warn" ? "text-[#f5c98a]" : tone === "hot" ? "text-forge-300" : ""}`}>{value}</dd></div>;
}
