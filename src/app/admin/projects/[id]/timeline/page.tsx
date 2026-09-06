import { requirePageUser } from "@/server/auth/session";
import { listMilestones } from "@/server/services/projects";
import { listTeam } from "@/server/services/directory";
import { ProjectPage } from "@/components/workspace/projectPage";
import { Milestones } from "@/components/workspace/Milestones";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}/timeline`);
  return <ProjectPage user={user} id={id} area="admin" tab="/timeline">{async (project) => <Milestones items={await listMilestones(user, project.id)} projectId={project.id} staff people={listTeam(user).map((t) => ({ id: t.id, name: t.name }))} />}</ProjectPage>;
}
