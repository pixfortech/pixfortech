import Link from "next/link";
import { Avatar, Badge, humanise, priorityTone, Progress, ProjectMark, statusTone, fmtDate } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

type P = { id: string; code: string; title: string; status: string; priority: string; health: string; progress: number; phase: string | null; startDate: Date | null; targetDate: Date | null; pixelTheme: string | null; organisation: { id: string; name: string }; manager: { id: string; name: string; image: string | null } | null };
const STATUS: Record<string, string> = { lead: "Lead", discovery: "Discovery", planning: "Planning", design: "Design", development: "Development", internal_qa: "Internal QA", client_review: "Client review", changes_requested: "Changes requested", final_qa: "Final QA", deployment: "Deployment", maintenance: "Maintenance", completed: "Completed", on_hold: "On hold" };

export function ProjectHeader({ project, area, current, actions }: { project: P; area: "portal" | "admin"; current: string; actions?: React.ReactNode }) {
  const base = `/${area}/projects/${project.id}`;
  const tabs = area === "admin"
    ? [["", "Overview"], ["/timeline", "Timeline"], ["/tasks", "Tasks"], ["/requests", "Requests"], ["/files", "Files"], ["/messages", "Messages"], ["/approvals", "Approvals"], ["/activity", "Activity"], ["/team", "Team"], ["/settings", "Settings"]]
    : [["", "Overview"], ["/timeline", "Timeline"], ["/requests", "Requests"], ["/files", "Files"], ["/messages", "Messages"], ["/approvals", "Approvals"], ["/activity", "Activity"]];
  return (
    <div className="mb-6">
      <p className="mb-2 text-[0.75rem] text-bone-400"><Link href={`/${area}/projects`} className="hover:text-bone-50">Projects</Link> <span className="text-bone-600">/</span> {area === "admin" ? <Link href={`/admin/clients/${project.organisation.id}`} className="hover:text-bone-50">{project.organisation.name}</Link> : project.organisation.name}</p>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ProjectMark theme={project.pixelTheme} size={26} />
            <h1 className="truncate font-display text-[1.5rem] font-semibold tracking-[-0.02em] sm:text-[1.75rem]">{project.title}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.8125rem] text-bone-400">
            <span className="num text-bone-200">{project.code}</span>
            <Badge tone={statusTone(project.status)}>{STATUS[project.status] ?? humanise(project.status)}</Badge>
            <Badge tone={priorityTone(project.priority)}>{project.priority}</Badge>
            <Badge tone={project.health === "on_track" ? "good" : project.health === "at_risk" ? "warn" : "bad"} dot>{humanise(project.health)}</Badge>
            {project.phase && <span>Phase: <span className="text-bone-200">{project.phase}</span></span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-bone-400">
            {project.manager && <span className="flex items-center gap-1.5"><Avatar name={project.manager.name} image={project.manager.image} size={18} />{project.manager.name}<span className="text-bone-600">· PM</span></span>}
            <span>Start <span className="text-bone-200">{fmtDate(project.startDate)}</span></span>
            <span>Target <span className="text-bone-200">{fmtDate(project.targetDate)}</span></span>
          </div>
          <Progress value={project.progress} className="w-full lg:w-64" label="Project progress" />
          {actions}
        </div>
      </div>
      <nav aria-label="Project sections" className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {tabs.map(([suffix, label]) => {
            const active = current === suffix;
            return <li key={suffix}><Link href={base + suffix} aria-current={active ? "page" : undefined} className={cn("block border-b-2 px-3 py-2 text-[0.8125rem] transition-colors", active ? "border-forge-500 text-bone-50" : "border-transparent text-bone-400 hover:text-bone-50")}>{label}</Link></li>;
          })}
        </ul>
      </nav>
    </div>
  );
}
