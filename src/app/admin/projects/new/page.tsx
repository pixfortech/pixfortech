import { requirePageUser } from "@/server/auth/session";
import { listClients, listTeam } from "@/server/services/directory";
import { Card, PageTitle } from "@/components/app/primitives";
import { ProjectForm } from "@/components/workspace/forms";

export default async function Page() {
  const user = await requirePageUser("/admin/projects/new");
  const [clients, team] = await Promise.all([listClients(user), listTeam(user)]);
  return (<div className="max-w-3xl"><PageTitle eyebrow="Admin" title="New project" description="A project gets a code, a chat, an internal channel and a place for everything else." /><Card className="p-5 sm:p-6"><ProjectForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} managers={team.filter((t) => t.role !== "team_member").map((t) => ({ id: t.id, name: t.name }))} /></Card></div>);
}
