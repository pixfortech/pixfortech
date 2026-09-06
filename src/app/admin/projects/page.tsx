import { requirePageUser } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";
import { listClients, listTeam } from "@/server/services/directory";
import { AppButton, PageTitle } from "@/components/app/primitives";
import { ProjectTable } from "@/components/workspace/lists";
import { Filters } from "@/components/workspace/Filters";

const STATUSES = ["lead", "discovery", "planning", "design", "development", "internal_qa", "client_review", "changes_requested", "final_qa", "deployment", "maintenance", "completed", "on_hold"];
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser("/admin/projects");
  const sp = await searchParams;
  const [projects, clients, team] = await Promise.all([listProjects(user, { status: sp.status, organisationId: sp.client, managerId: sp.manager }), listClients(user), listTeam(user)]);
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Projects" description={`${projects.length} project${projects.length === 1 ? "" : "s"}`} actions={<AppButton href="/admin/projects/new">New project</AppButton>} />
      <Filters fields={[{ name: "status", label: "Status", options: STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })) }, { name: "client", label: "Client", options: clients.map((c) => ({ value: c.id, label: c.name })) }, { name: "manager", label: "Manager", options: team.filter((t) => ["project_manager", "admin", "super_admin"].includes(t.role)).map((t) => ({ value: t.id, label: t.name })) }]} />
      <ProjectTable projects={projects} area="admin" />
    </div>
  );
}
