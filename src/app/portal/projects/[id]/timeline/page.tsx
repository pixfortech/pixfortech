import { requirePageUser } from "@/server/auth/session";
import { listMilestones } from "@/server/services/projects";
import { ProjectPage } from "@/components/workspace/projectPage";
import { Milestones } from "@/components/workspace/Milestones";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/projects/${id}/timeline`);
  return <ProjectPage user={user} id={id} area="portal" tab="/timeline">{async (project) => <Milestones items={await listMilestones(user, project.id)} projectId={project.id} staff={false} people={[]} />}</ProjectPage>;
}
