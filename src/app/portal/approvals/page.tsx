import { requirePageUser } from "@/server/auth/session";
import { getApproval, listApprovals } from "@/server/services/approvals";
import { canDecideApprovals } from "@/server/auth/permissions";
import { PageTitle } from "@/components/app/primitives";
import { ApprovalList } from "@/components/workspace/Approvals";

export default async function Page() {
  const user = await requirePageUser("/portal/approvals");
  const list = await listApprovals(user);
  const full = (await Promise.all(list.map(async (a) => (await getApproval(user, a.id))))).filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => ({ ...a, projectCode: a.project.code, projectTitle: a.project.title }));
  const pending = full.filter((a) => a.status === "pending");
  return (
    <div>
      <PageTitle eyebrow="Portal" title="Approvals" description={pending.length ? `${pending.length} decision${pending.length > 1 ? "s" : ""} waiting on you.` : "Nothing waiting on you."} />
      <ApprovalList items={[...pending, ...full.filter((a) => a.status !== "pending")]} staff={false} canDecide={canDecideApprovals(user)} showProject />
    </div>
  );
}
