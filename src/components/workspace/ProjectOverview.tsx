import Link from "next/link";
import type { SessionUser } from "@/server/auth/session";
import { listMilestones, type getProject } from "@/server/services/projects";
import { listRequests } from "@/server/services/requests";
import { listTasks } from "@/server/services/tasks";
import { listActivity } from "@/server/services/activity";
import { listApprovals } from "@/server/services/approvals";
import { listFiles } from "@/server/services/files";
import { isStaff } from "@/server/auth/permissions";
import { Avatar, Badge, Card, CardHeader, fmtDate, humanise, Progress, Stat, statusTone } from "@/components/app/primitives";
import { RequestList, TaskList } from "./lists";
import { ActivityFeed } from "./ActivityFeed";
import { FileList } from "./FileList";

export async function ProjectOverview({ user, project, area }: { user: SessionUser; project: Awaited<ReturnType<typeof getProject>>; area: "portal" | "admin" }) {
  const staff = isStaff(user);
  const [milestones, requests, tasks, approvals, files] = await Promise.all([(await listMilestones(user, project.id)), (await listRequests(user, { projectId: project.id, open: true })), (await listTasks(user, { projectId: project.id })), (await listApprovals(user, { projectId: project.id, status: "pending" })), (await listFiles(user, { projectId: project.id }))]);
  const activity = (await listActivity(user, { projectIds: [project.id], limit: 8 }));
  const openTasks = tasks.filter((t) => t.status !== "done");
  const next = milestones.find((m) => m.status !== "completed");
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        {project.summary && <Card className="p-5"><p className="text-[0.9375rem] leading-relaxed text-bone-200">{project.summary}</p></Card>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Open requests" value={requests.length} href={`/${area}/projects/${project.id}/requests`} />
          <Stat label={staff ? "Open tasks" : "Work in progress"} value={openTasks.length} href={staff ? `/admin/projects/${project.id}/tasks` : undefined} />
          <Stat label="Pending approvals" value={approvals.length} tone={approvals.length ? "hot" : "default"} href={`/${area}/projects/${project.id}/approvals`} />
        </div>
        <Card>
          <CardHeader title="Milestones" action={<Link href={`/${area}/projects/${project.id}/timeline`} className="text-[0.75rem] text-forge-300">Timeline</Link>} description={next ? `Next up: ${next.title}${next.dueDate ? `, due ${fmtDate(next.dueDate)}` : ""}` : "All milestones complete."} />
          <ol className="px-5 pb-5">
            {milestones.map((m) => (
              <li key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line-faint py-2.5 last:border-0 sm:grid-cols-[1fr_10rem_auto]">
                <span className="min-w-0 truncate text-[0.875rem] text-bone-50">{m.title}</span>
                <Progress value={m.progress} tone={m.status === "completed" ? "good" : "hot"} className="hidden sm:flex" label={`${m.title} progress`} />
                <Badge tone={statusTone(m.status)}>{humanise(m.status)}</Badge>
              </li>
            ))}
            {milestones.length === 0 && <li className="text-[0.8125rem] text-bone-400">No milestones yet.</li>}
          </ol>
        </Card>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">Open requests</h2><Link href={`/${area}/projects/${project.id}/requests`} className="text-[0.75rem] text-forge-300">All</Link></div><RequestList requests={requests.slice(0, 5)} area={area} /></section>
        {(staff || openTasks.length > 0) && <section><div className="mb-3 flex items-center justify-between"><h2 className="text-[0.9375rem] font-semibold">{staff ? "Tasks" : "Work in progress"}</h2>{staff && <Link href={`/admin/projects/${project.id}/tasks`} className="text-[0.75rem] text-forge-300">Board</Link>}</div><TaskList tasks={openTasks.slice(0, 6)} area={area} emptyTitle="No open tasks" emptyBody="Everything is done or nothing is planned yet." /></section>}
      </div>
      <aside className="flex flex-col gap-6 lg:col-span-4">
        <Card><CardHeader title="Team" /><ul className="flex flex-col gap-2 px-5 pb-5">{project.manager && <li className="flex items-center gap-2 text-[0.8125rem]"><Avatar name={project.manager.name} image={project.manager.image} size={22} /><span className="text-bone-50">{project.manager.name}</span><span className="text-bone-400">· Project manager</span></li>}{project.members.filter((m) => m.projectRole !== "client").map((m) => <li key={m.id} className="flex items-center gap-2 text-[0.8125rem]"><Avatar name={m.name} image={m.image} size={22} /><span className="text-bone-50">{m.name}</span><span className="text-bone-400">· {m.title ?? humanise(m.role)}</span></li>)}</ul></Card>
        <Card><CardHeader title="Latest files" action={<Link href={`/${area}/projects/${project.id}/files`} className="text-[0.75rem] text-forge-300">All</Link>} /><div className="px-5 pb-5"><FileList files={files.slice(0, 4)} staff={staff} currentUserId={user.id} /></div></Card>
        <Card><CardHeader title="Activity" action={<Link href={`/${area}/projects/${project.id}/activity`} className="text-[0.75rem] text-forge-300">All</Link>} /><div className="px-5 pb-5"><ActivityFeed items={activity} area={area} compact /></div></Card>
      </aside>
    </div>
  );
}
