import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/server/auth/session";
import { getTask } from "@/server/services/tasks";
import { listMilestones } from "@/server/services/projects";
import { listTeam } from "@/server/services/directory";
import { Avatar, Badge, Card, CardHeader, fmtDate, humanise, PageTitle, priorityTone, statusTone, timeAgo } from "@/components/app/primitives";
import { TaskForm } from "@/components/workspace/TaskForm";
import { ModalButton } from "@/components/workspace/ModalButton";
import { TaskComments } from "@/components/workspace/TaskComments";
import { FileList } from "@/components/workspace/FileList";
import { Uploader } from "@/components/workspace/Uploader";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/admin/tasks/${id}`);
  const t = await getTask(user, id).catch(() => null);
  if (!t) notFound();
  const [milestones, team] = await Promise.all([(await listMilestones(user, t.projectId)), Promise.resolve((await listTeam(user)))]);
  const checklist: { text: string; done: boolean }[] = t.checklist ? JSON.parse(t.checklist) : [];
  return (
    <div>
      <p className="mb-2 text-[0.75rem] text-bone-400"><Link href="/admin/tasks" className="hover:text-bone-50">Tasks</Link> <span className="text-bone-600">/</span> <Link href={`/admin/projects/${t.projectId}/tasks`} className="hover:text-bone-50">{t.projectCode}</Link> <span className="text-bone-600">/</span> <span className="num">{t.key}</span></p>
      <PageTitle title={t.title} description={<span className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge><Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>{!t.clientVisible && <Badge tone="internal">Internal</Badge>}{t.dueDate && <span className="text-bone-400">Due {fmtDate(t.dueDate, true)}</span>}</span>} actions={<ModalButton label="Edit task" title="Edit task" variant="secondary"><TaskForm people={team.map((m) => ({ id: m.id, name: m.name }))} milestones={milestones.map((m) => ({ id: m.id, title: m.title }))} task={t} /></ModalButton>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card><CardHeader title="Description" /><div className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-bone-200">{t.description ? <p className="whitespace-pre-wrap">{t.description}</p> : <p className="text-bone-400">No description.</p>}</div></Card>
          {checklist.length > 0 && <Card><CardHeader title="Checklist" description={`${checklist.filter((c) => c.done).length}/${checklist.length} done`} /><ul className="px-5 pb-5">{checklist.map((c, i) => <li key={i} className="flex items-center gap-2 py-1 text-[0.875rem]"><span className={`h-3.5 w-3.5 border ${c.done ? "border-forge-500 bg-forge-500" : "border-line-strong"}`} aria-hidden="true" /><span className={c.done ? "text-bone-400 line-through" : "text-bone-200"}>{c.text}</span></li>)}</ul></Card>}
          <Card><CardHeader title="Attachments" /><div className="flex flex-col gap-4 px-5 pb-5"><FileList files={t.files.map((f) => ({ ...f, uploader: null }))} staff currentUserId={user.id} /><Uploader projectId={t.projectId} taskId={t.id} staff compact /></div></Card>
          <Card><CardHeader title="Comments" description="Internal by default. Untick to make a comment visible to the client on client-visible tasks." /><div className="px-5 pb-5"><TaskComments taskId={t.id} comments={t.comments} clientVisibleTask={t.clientVisible} /></div></Card>
        </div>
        <aside className="lg:col-span-4">
          <Card><CardHeader title="Details" /><dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-5 text-[0.8125rem]"><dt className="text-bone-400">Project</dt><dd><Link href={`/admin/projects/${t.projectId}`} className="link-line text-bone-50">{t.projectTitle}</Link></dd><dt className="text-bone-400">Assignee</dt><dd className="flex items-center gap-1.5 text-bone-200">{t.assigneeName ? <><Avatar name={t.assigneeName} image={t.assigneeImage} size={16} />{t.assigneeName}</> : "Unassigned"}</dd><dt className="text-bone-400">Milestone</dt><dd className="text-bone-200">{milestones.find((m) => m.id === t.milestoneId)?.title ?? "—"}</dd><dt className="text-bone-400">Request</dt><dd>{t.requestId ? <Link href={`/admin/requests/${t.requestId}`} className="link-line text-bone-50">Linked request</Link> : "—"}</dd><dt className="text-bone-400">Labels</dt><dd className="flex flex-wrap gap-1">{t.labels ? (JSON.parse(t.labels) as string[]).map((l) => <Badge key={l}>{l}</Badge>) : "—"}</dd><dt className="text-bone-400">Created</dt><dd className="text-bone-200">{fmtDate(t.createdAt, true)}</dd><dt className="text-bone-400">Updated</dt><dd className="text-bone-200">{timeAgo(t.updatedAt)}</dd>{t.completedAt && <><dt className="text-bone-400">Completed</dt><dd className="text-bone-200">{fmtDate(t.completedAt, true)}</dd></>}</dl></Card>
        </aside>
      </div>
    </div>
  );
}
