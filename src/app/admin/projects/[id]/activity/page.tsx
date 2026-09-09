import { requirePageUser } from "@/server/auth/session";
import { listActivity } from "@/server/services/activity";
import { ProjectPage } from "@/components/workspace/projectPage";
import { ActivityFeed } from "@/components/workspace/ActivityFeed";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}/activity`);
  return <ProjectPage user={user} id={id} area="admin" tab="/activity">{async (project) => <ActivityFeed items={(await listActivity(user, { projectIds: [project.id], limit: 150 }))} area="admin" />}</ProjectPage>;
}
