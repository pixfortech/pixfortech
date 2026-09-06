import { requirePageUser } from "@/server/auth/session";
import { getApproval, listApprovals } from "@/server/services/approvals";
import { listMilestones } from "@/server/services/projects";
import { listRequests } from "@/server/services/requests";
import { ProjectPage } from "@/components/workspace/projectPage";
import { ApprovalList } from "@/components/workspace/Approvals";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/projects/${id}/approvals`);
  return <ProjectPage user={user} id={id} area="admin" tab="/approvals">{async (project) => {
    const [list, milestones, requests] = await Promise.all([listApprovals(user, { projectId: project.id }), listMilestones(user, project.id), listRequests(user, { projectId: project.id, open: true })]);
    const full = (await Promise.all(list.map((a) => getApproval(user, a.id)))).filter((a): a is NonNullable<typeof a> => Boolean(a));
    return <ApprovalList items={full} staff canDecide={false} projectId={project.id} milestones={milestones.map((m) => ({ id: m.id, title: m.title }))} requests={requests.map((r) => ({ id: r.id, ref: r.ref, title: r.title }))} />;
  }}</ProjectPage>;
}
