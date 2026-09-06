import { requirePageUser } from "@/server/auth/session";
import { ProjectPage } from "@/components/workspace/projectPage";
import { ProjectOverview } from "@/components/workspace/ProjectOverview";
import { AppButton } from "@/components/app/primitives";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/projects/${id}`);
  return <ProjectPage user={user} id={id} area="portal" tab="" actions={<AppButton size="sm" href={`/portal/requests/new?project=${id}`}>Request a change</AppButton>}>{(project) => <ProjectOverview user={user} project={project} area="portal" />}</ProjectPage>;
}
