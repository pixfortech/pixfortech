import { requirePageUser } from "@/server/auth/session";
import { listActivity, listAudit } from "@/server/services/activity";
import { accessibleProjectIds } from "@/server/services/access";
import { isAdmin } from "@/server/auth/permissions";
import { Card, CardHeader, PageTitle, Table, td, th, timeAgo } from "@/components/app/primitives";
import { ActivityFeed } from "@/components/workspace/ActivityFeed";
export default async function Page() {
  const user = await requirePageUser("/admin/activity");
  const ids = await accessibleProjectIds(user);
  const activity = listActivity(user, { projectIds: ids, limit: 120 });
  const audit = isAdmin(user) ? listAudit(80) : [];
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Activity" description="What happened across projects, and the administrative audit trail." />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7"><CardHeader title="Project activity" /><div className="px-5 pb-5"><ActivityFeed items={activity} area="admin" showProject /></div></Card>
        {isAdmin(user) && <Card className="lg:col-span-5"><CardHeader title="Audit log" description="Security-relevant changes: users, roles, deletions, uploads." /><div className="px-5 pb-5"><Table className="min-w-0"><thead><tr><th className={th}>When</th><th className={th}>Actor</th><th className={th}>Action</th></tr></thead><tbody>{audit.map((a) => <tr key={a.id}><td className={td + " num whitespace-nowrap text-bone-400"}>{timeAgo(a.createdAt)}</td><td className={td}>{a.actorName ?? "system"}</td><td className={td}><span className="text-bone-50">{a.action}</span> <span className="text-bone-400">{a.targetType}{a.targetId ? ` ${a.targetId.slice(0, 8)}` : ""}</span>{a.metadata && <span className="block truncate text-[0.6875rem] text-bone-600" title={a.metadata}>{a.metadata.slice(0, 80)}</span>}</td></tr>)}</tbody></Table></div></Card>}
      </div>
    </div>
  );
}
