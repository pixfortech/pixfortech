import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";
import { listRequests } from "@/server/services/requests";
import { listApprovals } from "@/server/services/approvals";
import { listFiles } from "@/server/services/files";
import { listConversations } from "@/server/services/messages";
import { listActivity } from "@/server/services/activity";
import { accessibleProjectIds } from "@/server/services/access";
import { listMilestones } from "@/server/services/projects";
import { AppButton, Card, CardHeader, PageTitle, Stat, Badge, fmtDate, humanise, statusTone } from "@/components/app/primitives";
import { ProjectCards, RequestList } from "@/components/workspace/lists";
import { ActivityFeed } from "@/components/workspace/ActivityFeed";
import { FileList } from "@/components/workspace/FileList";

export default async function PortalHome() {
  const user = await requirePageUser("/portal");
  const [projects, requests, approvals, files, conversations, ids] = await Promise.all([
    listProjects(user), listRequests(user, { open: true }), listApprovals(user, { status: "pending" }), listFiles(user), listConversations(user), accessibleProjectIds(user),
  ]);
  const activity = listActivity(user, { projectIds: ids, limit: 10 });
  const active = projects.filter((p) => !["completed", "on_hold"].includes(p.status));
  const overall = active.length ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0;
  const milestoneLists = await Promise.all(active.slice(0, 6).map((p) => listMilestones(user, p.id).then((ms) => ms.map((m) => ({ ...m, project: p })))));
  const upcoming = milestoneLists.flat().filter((m) => m.status !== "completed" && m.dueDate).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime()).slice(0, 5);
  const recentDone = milestoneLists.flat().filter((m) => m.status === "completed").sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4);
  const awaitingYou = requests.filter((r) => ["needs_clarification", "ready_for_review"].includes(r.status));
  const unread = conversations.reduce((n, c) => n + c.unread, 0);
  const first = user.name.split(" ")[0];

  return (
    <div>
      <PageTitle eyebrow="Client portal" title={`Welcome back, ${first}.`} description={active.length ? `${active.length} active project${active.length > 1 ? "s" : ""}, ${overall}% through on average.` : "Your projects will appear here once the team sets them up."} actions={<><AppButton href="/portal/requests/new">Request a change</AppButton><AppButton variant="secondary" href="/portal/messages">Send a message</AppButton></>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active projects" value={active.length} hint={`${overall}% average progress`} href="/portal/projects" />
        <Stat label="Awaiting your action" value={awaitingYou.length + approvals.length} tone={awaitingYou.length + approvals.length ? "hot" : "default"} hint={`${approvals.length} approval${approvals.length === 1 ? "" : "s"}, ${awaitingYou.length} request${awaitingYou.length === 1 ? "" : "s"}`} href="/portal/approvals" />
        <Stat label="Open requests" value={requests.length} href="/portal/requests" />
        <Stat label="Unread messages" value={unread} tone={unread ? "hot" : "default"} href="/portal/messages" />
      </div>

      {(approvals.length > 0 || awaitingYou.length > 0) && (
        <Card className="mt-6 border-forge-500/40">
          <CardHeader title="Needs your decision" description="The team is waiting on you for these." />
          <ul className="divide-y divide-line-faint px-5 pb-4">
            {approvals.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[0.875rem]"><span className="min-w-0 truncate"><Badge tone="warn" className="mr-2">Approval</Badge>{a.title} <span className="text-bone-400">· {a.projectCode}</span></span><Link href={`/portal/projects/${a.projectId}/approvals`} className="shrink-0 text-forge-300 hover:text-forge-400">Review →</Link></li>)}
            {awaitingYou.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[0.875rem]"><span className="min-w-0 truncate"><Badge tone={statusTone(r.status)} className="mr-2">{humanise(r.status)}</Badge>{r.ref} · {r.title}</span><Link href={`/portal/requests/${r.id}`} className="shrink-0 text-forge-300 hover:text-forge-400">Open →</Link></li>)}
          </ul>
        </Card>
      )}

      <section className="mt-8"><h2 className="mb-3 text-[0.9375rem] font-semibold">Your projects</h2><ProjectCards projects={active.length ? active : projects} area="portal" /></section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card><CardHeader title="Upcoming milestones" />
          <ul className="px-5 pb-5">{upcoming.length === 0 && <li className="text-[0.8125rem] text-bone-400">Nothing scheduled yet.</li>}{upcoming.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line-faint py-2 text-[0.8125rem] last:border-0"><span className="min-w-0"><span className="block truncate text-bone-50">{m.title}</span><span className="block text-[0.6875rem] text-bone-400">{m.project.code}</span></span><span className="num shrink-0 text-bone-400">{fmtDate(m.dueDate)}</span></li>)}</ul>
        </Card>
        <Card><CardHeader title="Recently completed" />
          <ul className="px-5 pb-5">{recentDone.length === 0 && <li className="text-[0.8125rem] text-bone-400">Nothing finished yet. Soon.</li>}{recentDone.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line-faint py-2 text-[0.8125rem] last:border-0"><span className="min-w-0"><span className="block truncate text-bone-50">{m.title}</span><span className="block text-[0.6875rem] text-bone-400">{m.project.code}</span></span><Badge tone="good">Done</Badge></li>)}</ul>
        </Card>
        <Card><CardHeader title="Latest activity" action={<Link href="/portal/notifications" className="text-[0.75rem] text-forge-300">Notifications</Link>} /><div className="px-5 pb-5"><ActivityFeed items={activity} area="portal" showProject compact /></div></Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">Open requests</h2><Link href="/portal/requests" className="text-[0.75rem] text-forge-300">All requests</Link></div><RequestList requests={requests.slice(0, 5)} area="portal" /></section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">Latest files</h2><Link href="/portal/files" className="text-[0.75rem] text-forge-300">All files</Link></div><FileList files={files.slice(0, 5)} staff={false} currentUserId={user.id} showProject /></section>
      </div>
      <p className="mt-8 text-[0.75rem] text-bone-600">Last sign-in activity is recorded for security. Something look wrong? Message the team from any project.</p>
    </div>
  );
}
