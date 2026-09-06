import { requirePageUser } from "@/server/auth/session";
import { listRequests } from "@/server/services/requests";
import { listProjects } from "@/server/services/projects";
import { AppButton, PageTitle } from "@/components/app/primitives";
import { RequestList } from "@/components/workspace/lists";
import { Filters } from "@/components/workspace/Filters";

const STATUSES = ["submitted", "acknowledged", "under_review", "needs_clarification", "estimated", "approved", "scheduled", "in_progress", "ready_for_review", "changes_requested", "completed", "closed", "rejected", "cancelled"];
const TYPES = ["edit", "bug", "feature", "design", "content", "integration", "performance", "other"];

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageUser("/portal/requests");
  const sp = await searchParams;
  const [requests, projects] = await Promise.all([listRequests(user, { status: sp.status, type: sp.type, priority: sp.priority, projectId: sp.project }), listProjects(user)]);
  return (
    <div>
      <PageTitle eyebrow="Portal" title="Requests" description="Edits, bugs, features and ideas, tracked from submission to completion." actions={<AppButton href="/portal/requests/new">Request a change</AppButton>} />
      <Filters fields={[{ name: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.code })) }, { name: "status", label: "Status", options: STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })) }, { name: "type", label: "Type", options: TYPES.map((t) => ({ value: t, label: t })) }, { name: "priority", label: "Priority", options: ["low", "medium", "high", "urgent"].map((p) => ({ value: p, label: p })) }]} />
      <RequestList requests={requests} area="portal" />
    </div>
  );
}
