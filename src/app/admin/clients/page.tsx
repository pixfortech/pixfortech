import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { listClients } from "@/server/services/directory";
import { PageTitle, Table, td, th, EmptyState, ProjectMark } from "@/components/app/primitives";
import { ModalButton } from "@/components/workspace/ModalButton";
import { ClientForm } from "@/components/workspace/forms";

export default async function Page() {
  const user = await requirePageUser("/admin/clients");
  const clients = listClients(user);
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Clients" description="Organisations you build for. Each one is isolated from the others." actions={<ModalButton label="Add client" title="Add client"><ClientForm /></ModalButton>} />
      {clients.length === 0 ? <EmptyState title="No clients yet" body="Add the first organisation to start a project for them." /> : (
        <Table><thead><tr><th className={th}>Client</th><th className={th}>Industry</th><th className={th}>Projects</th><th className={th}>Users</th><th className={th}>Website</th></tr></thead>
          <tbody>{clients.map((c) => <tr key={c.id} className="hover:bg-bone-50/[0.03]"><td className={td}><Link href={`/admin/clients/${c.id}`} className="flex items-center gap-2.5 font-medium text-bone-50 hover:text-forge-300"><ProjectMark theme={c.pixelTheme} size={18} />{c.name}</Link></td><td className={td}>{c.industry ?? "—"}</td><td className={td + " num"}>{c.projects}</td><td className={td + " num"}>{c.users}</td><td className={td}>{c.website ? <a href={c.website} className="text-bone-400 hover:text-bone-50" rel="noopener" target="_blank">{c.website.replace(/^https?:\/\//, "")}</a> : "—"}</td></tr>)}</tbody>
        </Table>
      )}
    </div>
  );
}
