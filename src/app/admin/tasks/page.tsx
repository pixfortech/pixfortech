import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { listTasks } from "@/server/services/tasks";
import { listProjects } from "@/server/services/projects";
import { listTeam } from "@/server/services/directory";
import { AppButton, PageTitle } from "@/components/app/primitives";
import { TaskBoard } from "@/components/workspace/TaskBoard";
import { TaskList } from "@/components/workspace/lists";
import { Filters } from "@/components/workspace/Filters";
import { cn } from "@/lib/utils";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser("/admin/tasks");
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "board";
  const assignee = sp.assignee === "me" ? user.id : sp.assignee;
  const [tasks, projects, team] = await Promise.all([(await listTasks(user, { projectId: sp.project, assigneeId: assignee, priority: sp.priority, status: sp.status, due: sp.due as "today" | "overdue" | "week" | undefined })), (await listProjects(user)), (await listTeam(user))]);
  const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "view") as [string, string][]);
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Tasks" description={`${tasks.filter((t) => t.status !== "done").length} open across ${new Set(tasks.map((t) => t.projectId)).size} project${new Set(tasks.map((t) => t.projectId)).size === 1 ? "" : "s"}`} actions={<AppButton href="/admin/tasks/new">New task</AppButton>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-line p-0.5 text-[0.75rem]">{(["board", "list"] as const).map((v) => <Link key={v} href={`/admin/tasks?${new URLSearchParams({ ...Object.fromEntries(q), view: v })}`} className={cn("rounded-sm px-3 py-1 capitalize", view === v ? "bg-bone-50/10 text-bone-50" : "text-bone-400 hover:text-bone-50")}>{v}</Link>)}</div>
        <div className="flex flex-wrap gap-1 text-[0.75rem]">{[["", "All"], ["assignee=me", "My tasks"], ["due=week", "Due soon"], ["due=overdue", "Overdue"]].map(([qs, l]) => <Link key={l} href={`/admin/tasks${qs ? `?${qs}&view=${view}` : `?view=${view}`}`} className={cn("rounded-pill border px-2.5 py-1", (qs === "" && !sp.assignee && !sp.due) || (qs && Object.entries(sp).some(([k, v]) => `${k}=${v}` === qs)) ? "border-forge-500 text-forge-300" : "border-line text-bone-400 hover:text-bone-50")}>{l}</Link>)}</div>
      </div>
      <Filters fields={[{ name: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.code })) }, { name: "assignee", label: "Assignee", options: team.map((t) => ({ value: t.id, label: t.name })) }, { name: "status", label: "Status", options: ["backlog", "todo", "in_progress", "in_review", "blocked", "done"].map((s) => ({ value: s, label: s.replace("_", " ") })) }, { name: "priority", label: "Priority", options: ["low", "medium", "high", "urgent"].map((p) => ({ value: p, label: p })) }]} />
      {view === "board" ? <TaskBoard tasks={tasks} showProject /> : <TaskList tasks={tasks} area="admin" />}
    </div>
  );
}
