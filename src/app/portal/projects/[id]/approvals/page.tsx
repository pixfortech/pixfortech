import { requirePageUser } from "@/server/auth/session";
import { getApproval, listApprovals } from "@/server/services/approvals";
import { ProjectPage } from "@/components/workspace/projectPage";
import { ApprovalList } from "@/components/workspace/Approvals";
import { canDecideApprovals } from "@/server/auth/permissions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/projects/${id}/approvals`);
  return <ProjectPage user={user} id={id} area="portal" tab="/approvals">{async (project) => {
    const list = await listApprovals(user, { projectId: project.id });
    const full = (await Promise.all(list.map(async (a) => (await getApproval(user, a.id))))).filter((a): a is NonNullable<typeof a> => Boolean(a));
    return <ApprovalList items={full.map((a) => ({ ...a, requestedBy: a.requestedBy }))} staff={false} canDecide={canDecideApprovals(user)} />;
  }}</ProjectPage>;
}
