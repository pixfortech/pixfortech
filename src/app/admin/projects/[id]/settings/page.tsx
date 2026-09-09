import { requirePageUser } from "@/server/auth/session";
import { listTeam } from "@/server/services/directory";
import { ProjectPage } from "@/components/workspace/projectPage";
import { ProjectForm, WorkflowForm } from "@/components/workspace/forms";
import { Card, CardHeader } from "@/components/app/primitives";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}/settings`);
  const team = (await listTeam(user));
  return <ProjectPage user={user} id={id} area="admin" tab="/settings">{(project) => (<div className="grid gap-6 lg:grid-cols-12"><Card className="lg:col-span-8"><CardHeader title="Project details" /><div className="px-5 pb-5"><ProjectForm clients={[]} managers={team.filter((t) => t.role !== "team_member").map((t) => ({ id: t.id, name: t.name }))} project={project} workflow={project.workflow} /></div></Card><Card className="lg:col-span-4"><CardHeader title="Workflow" description="Customise the status pipeline for this project." /><div className="px-5 pb-5"><WorkflowForm projectId={project.id} workflow={project.workflow} /></div></Card></div>)}</ProjectPage>;
}
