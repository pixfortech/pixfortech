import { requirePageUser } from "@/server/auth/session";
import { listRequests } from "@/server/services/requests";
import { listClients, listTeam } from "@/server/services/directory";
import { AppButton, PageTitle } from "@/components/app/primitives";
import { RequestList } from "@/components/workspace/lists";
import { Filters } from "@/components/workspace/Filters";
const STATUSES = ["submitted", "acknowledged", "under_review", "needs_clarification", "estimated", "approved", "scheduled", "in_progress", "ready_for_review", "changes_requested", "completed", "closed", "rejected", "cancelled"];
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser("/admin/requests");
  const sp = await searchParams;
  const [requests, clients, team] = await Promise.all([(await listRequests(user, { status: sp.status, type: sp.type, priority: sp.priority, organisationId: sp.client, assigneeId: sp.assignee === "me" ? user.id : sp.assignee })), (await listClients(user)), (await listTeam(user))]);
  const open = requests.filter((r) => !["completed", "closed", "rejected", "cancelled"].includes(r.status));
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Requests" description={`${open.length} open · ${requests.filter((r) => r.status === "submitted").length} new`} actions={<AppButton variant="secondary" href="/admin/requests/new">Log a request</AppButton>} />
      <Filters fields={[{ name: "status", label: "Status", options: STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })) }, { name: "type", label: "Type", options: ["edit", "bug", "feature", "design", "content", "integration", "performance", "other"].map((t) => ({ value: t, label: t })) }, { name: "priority", label: "Priority", options: ["low", "medium", "high", "urgent"].map((p) => ({ value: p, label: p })) }, { name: "client", label: "Client", options: clients.map((c) => ({ value: c.id, label: c.name })) }, { name: "assignee", label: "Assignee", options: [{ value: "me", label: "Me" }, ...team.map((t) => ({ value: t.id, label: t.name }))] }]} />
      <RequestList requests={sp.status || sp.assignee || sp.client || sp.type || sp.priority ? requests : [...open, ...requests.filter((r) => !open.includes(r))]} area="admin" emptyTitle="No requests match" emptyBody="Try clearing a filter." />
    </div>
  );
}
