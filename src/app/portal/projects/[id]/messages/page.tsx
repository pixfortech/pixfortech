import { requirePageUser } from "@/server/auth/session";
import { listConversations, listMessages } from "@/server/services/messages";
import { ProjectPage } from "@/components/workspace/projectPage";
import { Chat } from "@/components/workspace/Chat";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/projects/${id}/messages`);
  return <ProjectPage user={user} id={id} area="portal" tab="/messages">{async (project) => {
    const convs = await listConversations(user, project.id);
    const main = convs.find((c) => !c.requestId && !c.internal);
    if (!main) return <p className="text-bone-400">No conversation yet.</p>;
    const { messages, readers } = await listMessages(user, main.id);
    const people = [...(project.manager ? [project.manager] : []), ...project.members];
    return <Chat conversationId={main.id} projectId={project.id} messages={messages} readers={readers} currentUserId={user.id} participants={people.map((p) => ({ id: p.id, name: p.name }))} />;
  }}</ProjectPage>;
}
