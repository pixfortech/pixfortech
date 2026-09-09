import { requirePageUser } from "@/server/auth/session";
import { assignableUsers } from "@/server/services/directory";
import { ProjectPage } from "@/components/workspace/projectPage";
import { MembersForm } from "@/components/workspace/forms";
import { Card, CardHeader } from "@/components/app/primitives";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}/team`);
  return <ProjectPage user={user} id={id} area="admin" tab="/team">{async (project) => (<Card><CardHeader title="Who is on this project" description="Staff members see the project in their lists; client members get portal access to it. Client admins always see their organisation's projects." /><div className="px-5 pb-5"><MembersForm projectId={project.id} people={(await assignableUsers(user, project.organisationId))} current={project.members.map((m) => ({ id: m.id, projectRole: m.projectRole }))} /></div></Card>)}</ProjectPage>;
}
