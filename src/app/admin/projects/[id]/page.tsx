import { requirePageUser } from "@/server/auth/session";
import { ProjectPage } from "@/components/workspace/projectPage";
import { ProjectOverview } from "@/components/workspace/ProjectOverview";
import { AppButton } from "@/components/app/primitives";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}`);
  return <ProjectPage user={user} id={id} area="admin" tab="" actions={<AppButton size="sm" variant="secondary" href={`/admin/projects/${id}/settings`}>Edit project</AppButton>}>{(project) => <ProjectOverview user={user} project={project} area="admin" />}</ProjectPage>;
}
