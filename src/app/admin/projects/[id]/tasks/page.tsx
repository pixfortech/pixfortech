import { requirePageUser } from "@/server/auth/session";
import { listTasks } from "@/server/services/tasks";
import { listMilestones } from "@/server/services/projects";
import { listTeam } from "@/server/services/directory";
import { ProjectPage } from "@/components/workspace/projectPage";
import { TaskBoard } from "@/components/workspace/TaskBoard";
import { TaskForm } from "@/components/workspace/TaskForm";
import { ModalButton } from "@/components/workspace/ModalButton";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}/tasks`);
  return <ProjectPage user={user} id={id} area="admin" tab="/tasks">{async (project) => {
    const [tasks, milestones] = await Promise.all([listTasks(user, { projectId: project.id }), listMilestones(user, project.id)]);
    const people = listTeam(user).map((t) => ({ id: t.id, name: t.name }));
    return (<div><div className="mb-4 flex justify-end"><ModalButton label="New task" title="New task" size="sm"><TaskForm projectId={project.id} people={people} milestones={milestones.map((m) => ({ id: m.id, title: m.title }))} /></ModalButton></div><TaskBoard tasks={tasks} /></div>);
  }}</ProjectPage>;
}
