import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/server/auth/session";
import { getClient } from "@/server/services/directory";
import { listProjects } from "@/server/services/projects";
import { canManageClientUsers, canManageClients } from "@/server/auth/permissions";
import { AppButton, Avatar, Badge, Card, CardHeader, PageTitle, ProjectMark, humanise } from "@/components/app/primitives";
import { ProjectTable } from "@/components/workspace/lists";
import { ModalButton } from "@/components/workspace/ModalButton";
import { ClientForm, InviteForm, UserRow } from "@/components/workspace/forms";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/clients/${id}`);
  const client = getClient(user, id);
  if (!client) notFound();
  const projects = await listProjects(user, { organisationId: id });
  return (
    <div>
      <p className="mb-2 text-[0.75rem] text-bone-400"><Link href="/admin/clients" className="hover:text-bone-50">Clients</Link></p>
      <PageTitle title={<span className="flex items-center gap-3"><ProjectMark theme={client.pixelTheme} size={26} />{client.name}</span>} description={[client.industry, client.website].filter(Boolean).join(" · ") || "No details yet."} actions={<>{canManageClients(user) && <ModalButton label="Edit" title="Edit client" variant="secondary">{(done) => <ClientForm client={client} onDone={done} />}</ModalButton>}<AppButton href="/admin/projects/new">New project</AppButton></>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <section><h2 className="mb-3 text-[0.9375rem] font-semibold">Projects</h2><ProjectTable projects={projects} area="admin" /></section>
          {client.notes && <Card><CardHeader title="Internal notes" description="Never shown to the client." /><p className="whitespace-pre-wrap px-5 pb-5 text-[0.875rem] text-bone-200">{client.notes}</p></Card>}
        </div>
        <Card className="lg:col-span-4">
          <CardHeader title="People" description="Client admins see every project of theirs; members only those they are added to." action={canManageClientUsers(user) ? <ModalButton label="Invite" title="Invite a client user" size="sm" variant="secondary">{(done) => <InviteForm organisations={[]} defaultOrganisationId={client.id} roles={["client_member", "client_admin"]} onDone={done} />}</ModalButton> : undefined} />
          <ul className="divide-y divide-line-faint px-5 pb-5">
            {client.users.length === 0 && <li className="py-3 text-[0.8125rem] text-bone-400">No users invited yet.</li>}
            {client.users.map((u) => (
              <li key={u.id} className="flex flex-col gap-2 py-3 text-[0.8125rem]">
                <div className="flex items-center gap-2"><Avatar name={u.name} image={u.image} size={24} /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-bone-50">{u.name}{u.disabled && <Badge tone="bad" className="ml-2">Disabled</Badge>}</span><span className="block truncate text-bone-400">{u.email}{u.title ? ` · ${u.title}` : ""}</span></span>{!u.emailVerified && <Badge tone="warn">Unverified</Badge>}</div>
                <UserRow user={u} roles={["client_member", "client_admin"]} canEdit={canManageClientUsers(user)} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-4 text-[0.6875rem] text-bone-600">Roles: {["client_admin", "client_member"].map(humanise).join(", ")}.</p>
    </div>
  );
}
