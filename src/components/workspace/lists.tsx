import Link from "next/link";
import { copy } from "@content/microcopy";
import { Avatar, Badge, dueTone, fmtDate, humanise, priorityTone, Progress, ProjectMark, statusTone, Table, td, th, timeAgo, EmptyState } from "@/components/app/primitives";

export type ProjectRow = { id: string; code: string; title: string; status: string; priority: string; health: string; progress: number; phase: string | null; targetDate: Date | null; updatedAt: Date; pixelTheme: string | null; organisationName: string; managerName: string | null };
const STATUS: Record<string, string> = { lead: "Lead", discovery: "Discovery", planning: "Planning", design: "Design", development: "Development", internal_qa: "Internal QA", client_review: "Client review", changes_requested: "Changes requested", final_qa: "Final QA", deployment: "Deployment", maintenance: "Maintenance", completed: "Completed", on_hold: "On hold" };

export function ProjectCards({ projects, area }: { projects: ProjectRow[]; area: "portal" | "admin" }) {
  if (!projects.length) return <EmptyState title="Nothing on the anvil yet" body={area === "admin" ? "Create the first project to start tracking work." : "Your projects will appear here as soon as the team sets them up."} />;
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <li key={p.id} className="min-w-0">
          <Link href={`/${area}/projects/${p.id}`} className="flex h-full flex-col rounded-lg border border-line bg-ink-850/60 p-4 transition-colors hover:border-line-strong hover:bg-ink-850">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5"><ProjectMark theme={p.pixelTheme} size={22} /><div className="min-w-0"><p className="truncate font-medium text-bone-50">{p.title}</p><p className="num text-[0.75rem] text-bone-400">{p.code}{area === "admin" ? ` · ${p.organisationName}` : ""}</p></div></div>
              <Badge tone={p.health === "on_track" ? "good" : p.health === "at_risk" ? "warn" : "bad"} dot>{humanise(p.health)}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.75rem]"><Badge tone={statusTone(p.status)}>{STATUS[p.status] ?? humanise(p.status)}</Badge>{p.phase && <span className="text-bone-400">{p.phase}</span>}</div>
            <Progress value={p.progress} className="mt-4" label={`${p.title} progress`} />
            <p className="mt-3 flex items-center justify-between text-[0.75rem] text-bone-400"><span>Target {fmtDate(p.targetDate)}</span><span>{p.managerName ? `PM ${p.managerName.split(" ")[0]}` : ""}</span></p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProjectTable({ projects, area }: { projects: ProjectRow[]; area: "portal" | "admin" }) {
  if (!projects.length) return <EmptyState title="Nothing on the anvil yet" body="No projects match these filters." />;
  return (
    <>
      <div className="md:hidden"><ProjectCards projects={projects} area={area} /></div>
      <Table className="hidden md:block">
        <thead><tr><th className={th}>Project</th><th className={th}>Client</th><th className={th}>Status</th><th className={th}>Health</th><th className={th}>Progress</th><th className={th}>PM</th><th className={th}>Target</th><th className={th}>Updated</th></tr></thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="hover:bg-bone-50/[0.03]">
              <td className={td}><Link href={`/${area}/projects/${p.id}`} className="flex items-center gap-2.5 font-medium text-bone-50 hover:text-forge-300"><ProjectMark theme={p.pixelTheme} size={18} /><span><span className="block">{p.title}</span><span className="num block text-[0.6875rem] font-normal text-bone-400">{p.code}</span></span></Link></td>
              <td className={td}>{p.organisationName}</td>
              <td className={td}><Badge tone={statusTone(p.status)}>{STATUS[p.status] ?? humanise(p.status)}</Badge></td>
              <td className={td}><Badge tone={p.health === "on_track" ? "good" : p.health === "at_risk" ? "warn" : "bad"} dot>{humanise(p.health)}</Badge></td>
              <td className={td + " w-40"}><Progress value={p.progress} label={`${p.title} progress`} /></td>
              <td className={td}>{p.managerName ?? "—"}</td>
              <td className={td}><Badge tone={dueTone(p.targetDate, p.status === "completed")}>{fmtDate(p.targetDate)}</Badge></td>
              <td className={td + " num text-bone-400"}>{timeAgo(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export type RequestRow = { id: string; ref: string; title: string; type: string; status: string; priority: string; projectCode: string; projectTitle: string; projectId: string; updatedAt: Date; createdAt: Date; requester: { name: string; image: string | null } | null; assignee: { name: string; image: string | null } | null };
const RLABEL: Record<string, string> = { submitted: "Submitted", acknowledged: "Acknowledged", under_review: "Under review", needs_clarification: "Needs clarification", estimated: "Estimated", approved: "Approved", scheduled: "Scheduled", in_progress: "In progress", ready_for_review: "Ready for review", changes_requested: "Changes requested", completed: "Completed", closed: "Closed", rejected: "Rejected", cancelled: "Cancelled" };
const TLABEL: Record<string, string> = { edit: "Edit", bug: "Bug", feature: "Feature", design: "Design", content: "Content", integration: "Integration", performance: "Performance", other: "Other" };

export function RequestList({ requests, area, emptyTitle = copy.portal.requestsEmpty, emptyBody = copy.portal.requestsEmptyBody }: { requests: RequestRow[]; area: "portal" | "admin"; emptyTitle?: string; emptyBody?: string }) {
  if (!requests.length) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return (
    <ul className="divide-y divide-line-faint rounded-lg border border-line">
      {requests.map((r) => (
        <li key={r.id}>
          <Link href={`/${area}/requests/${r.id}`} className="flex flex-col gap-2 px-4 py-3 hover:bg-bone-50/[0.03] sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[0.6875rem]"><span className="num text-bone-400">{r.ref}</span><Badge tone="neutral">{TLABEL[r.type] ?? r.type}</Badge><span className="text-bone-600">{r.projectCode} · {r.projectTitle}</span></p>
              <p className="mt-0.5 truncate font-medium text-bone-50">{r.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-bone-400">
              <Badge tone={statusTone(r.status)}>{RLABEL[r.status] ?? humanise(r.status)}</Badge>
              <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
              {r.assignee && <span className="hidden items-center gap-1 sm:inline-flex"><Avatar name={r.assignee.name} image={r.assignee.image} size={16} />{r.assignee.name.split(" ")[0]}</span>}
              <span className="num">{timeAgo(r.updatedAt)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type TaskRow = { id: string; key: string; title: string; status: string; priority: string; dueDate: Date | null; assigneeName: string | null; assigneeImage: string | null; projectCode: string; projectTitle: string; projectId: string; clientVisible: boolean };
export function TaskList({ tasks, area, emptyTitle = copy.empty.tasks.title, emptyBody = copy.empty.tasks.body }: { tasks: TaskRow[]; area: "portal" | "admin"; emptyTitle?: string; emptyBody?: string }) {
  if (!tasks.length) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return (
    <ul className="divide-y divide-line-faint rounded-lg border border-line">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link href={area === "admin" ? `/admin/tasks/${t.id}` : `/portal/projects/${t.projectId}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-bone-50/[0.03] sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1"><p className="num text-[0.6875rem] text-bone-400">{t.key} · {t.projectCode}</p><p className="truncate font-medium text-bone-50">{t.title}</p></div>
            <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-bone-400">
              <Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge><Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
              {t.assigneeName && <span className="inline-flex items-center gap-1"><Avatar name={t.assigneeName} image={t.assigneeImage} size={16} />{t.assigneeName.split(" ")[0]}</span>}
              {t.dueDate && <Badge tone={dueTone(t.dueDate, t.status === "done")}>{fmtDate(t.dueDate)}</Badge>}
              {area === "admin" && !t.clientVisible && <Badge tone="internal">Internal</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
