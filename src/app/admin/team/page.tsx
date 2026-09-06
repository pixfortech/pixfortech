import { requirePageUser } from "@/server/auth/session";
import { listTeam } from "@/server/services/directory";
import { canManageTeam } from "@/server/auth/permissions";
import { Avatar, Badge, PageTitle, Table, td, th } from "@/components/app/primitives";
import { ModalButton } from "@/components/workspace/ModalButton";
import { InviteForm, UserRow } from "@/components/workspace/forms";
const ROLES = ["team_member", "project_manager", "admin", "super_admin"];
export default async function Page() {
  const user = await requirePageUser("/admin/team");
  const team = listTeam(user);
  const manage = canManageTeam(user);
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Team" description="Who works here and what they are carrying." actions={manage ? <ModalButton label="Invite staff" title="Invite a team member">{(done) => <InviteForm organisations={[]} roles={user.role === "super_admin" ? ROLES : ROLES.filter((r) => r !== "super_admin")} onDone={done} />}</ModalButton> : undefined} />
      <Table><thead><tr><th className={th}>Person</th><th className={th}>Role</th><th className={th}>Managing</th><th className={th}>Open tasks</th><th className={th}>Open requests</th><th className={th}>Load</th></tr></thead>
        <tbody>{team.map((m) => <tr key={m.id} className="hover:bg-bone-50/[0.03]"><td className={td}><span className="flex items-center gap-2.5"><Avatar name={m.name} image={m.image} size={26} /><span><span className="block font-medium text-bone-50">{m.name}{m.disabled && <Badge tone="bad" className="ml-2">Disabled</Badge>}</span><span className="block text-[0.75rem] text-bone-400">{m.email}{m.title ? ` · ${m.title}` : ""}</span></span></span></td><td className={td}><UserRow user={m} roles={user.role === "super_admin" ? ROLES : ROLES.filter((r) => r !== "super_admin")} canEdit={manage && m.id !== user.id} /></td><td className={td + " num"}>{m.managing}</td><td className={td + " num"}>{m.openTasks}</td><td className={td + " num"}>{m.openRequests}</td><td className={td}><span className="block h-1.5 w-24 overflow-hidden rounded-pill bg-ink-700"><span className={`block h-full ${m.openTasks + m.openRequests > 6 ? "bg-[#f0b35a]" : "bg-forge-500"}`} style={{ width: `${Math.min(100, (m.openTasks + m.openRequests) * 12)}%` }} /></span></td></tr>)}</tbody>
      </Table>
    </div>
  );
}
