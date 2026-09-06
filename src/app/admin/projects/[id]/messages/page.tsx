import Link from "next/link";
import { requirePageUser } from "@/server/auth/session";
import { listConversations, listMessages } from "@/server/services/messages";
import { ProjectPage } from "@/components/workspace/projectPage";
import { Chat } from "@/components/workspace/Chat";
import { cn } from "@/lib/utils";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const { id } = await params;
  const { c } = await searchParams;
  const user = await requirePageUser(`/admin/projects/${id}/messages`);
  return <ProjectPage user={user} id={id} area="admin" tab="/messages">{async (project) => {
    const convs = await listConversations(user, project.id);
    const current = convs.find((x) => x.id === c) ?? convs.find((x) => !x.requestId && !x.internal) ?? convs[0];
    if (!current) return <p className="text-bone-400">No conversation yet.</p>;
    const { messages, readers } = await listMessages(user, current.id);
    const people = [...(project.manager ? [project.manager] : []), ...project.members];
    return (
      <div className="grid gap-4 lg:grid-cols-12">
        <ul className="flex gap-1 overflow-x-auto lg:col-span-3 lg:flex-col">{convs.map((x) => <li key={x.id}><Link href={`/admin/projects/${project.id}/messages?c=${x.id}`} className={cn("block whitespace-nowrap rounded-md border px-3 py-2 text-[0.8125rem]", current.id === x.id ? "border-forge-500/60 bg-forge-500/10 text-bone-50" : "border-line text-bone-200 hover:border-line-strong", x.internal && "pf-internal")}>{x.title}{x.unread > 0 && <span className="num ml-2 rounded-pill bg-forge-500 px-1.5 text-[0.625rem] text-ink-950">{x.unread}</span>}</Link></li>)}</ul>
        <div className="lg:col-span-9"><Chat conversationId={current.id} projectId={project.id} messages={messages} readers={readers} currentUserId={user.id} internal={current.internal} participants={people.map((p) => ({ id: p.id, name: p.name }))} /></div>
      </div>
    );
  }}</ProjectPage>;
}
