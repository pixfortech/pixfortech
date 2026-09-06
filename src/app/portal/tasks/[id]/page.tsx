import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { getTask } from "@/server/services/tasks";
import { Badge, Card, CardHeader, fmtDate, humanise, PageTitle, priorityTone, statusTone } from "@/components/app/primitives";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/tasks/${id}`);
  const t = await getTask(user, id).catch(() => null);
  if (!t) notFound();
  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-[0.75rem] text-bone-400"><Link href={`/portal/projects/${t.projectId}`} className="hover:text-bone-50">{t.projectCode} · {t.projectTitle}</Link></p>
      <PageTitle title={t.title} description={<span className="flex flex-wrap gap-2"><Badge tone={statusTone(t.status)}>{humanise(t.status)}</Badge><Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>{t.dueDate && <span className="text-bone-400">Due {fmtDate(t.dueDate)}</span>}</span>} />
      <Card><CardHeader title="Details" /><div className="px-5 pb-5 text-[0.875rem] text-bone-200">{t.description ? <p className="whitespace-pre-wrap">{t.description}</p> : <p className="text-bone-400">No description.</p>}{t.assigneeName && <p className="mt-3 text-bone-400">Working on it: <span className="text-bone-50">{t.assigneeName}</span></p>}</div></Card>
    </div>
  );
}
