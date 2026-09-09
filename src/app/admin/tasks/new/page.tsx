import { requirePageUser } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";
import { listTeam } from "@/server/services/directory";
import { Card, PageTitle } from "@/components/app/primitives";
import { TaskForm } from "@/components/workspace/TaskForm";
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requirePageUser("/admin/tasks/new");
  const { project } = await searchParams;
  const [projects, team] = await Promise.all([(await listProjects(user)), (await listTeam(user))]);
  return (<div className="max-w-3xl"><PageTitle eyebrow="Admin" title="New task" /><Card className="p-5 sm:p-6"><TaskForm projectId={project} projects={projects.map((p) => ({ id: p.id, code: p.code, title: p.title }))} people={team.map((t) => ({ id: t.id, name: t.name }))} /></Card></div>);
}
