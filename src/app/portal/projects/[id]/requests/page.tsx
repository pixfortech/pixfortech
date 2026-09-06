import { requirePageUser } from "@/server/auth/session";
import { listRequests } from "@/server/services/requests";
import { ProjectPage } from "@/components/workspace/projectPage";
import { RequestList } from "@/components/workspace/lists";
import { AppButton } from "@/components/app/primitives";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/projects/${id}/requests`);
  return <ProjectPage user={user} id={id} area="portal" tab="/requests" actions={<AppButton size="sm" href={`/portal/requests/new?project=${id}`}>Request a change</AppButton>}>{async (project) => <RequestList requests={await listRequests(user, { projectId: project.id })} area="portal" />}</ProjectPage>;
}
