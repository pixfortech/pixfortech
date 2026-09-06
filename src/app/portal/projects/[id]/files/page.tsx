import { requirePageUser } from "@/server/auth/session";
import { listFiles } from "@/server/services/files";
import { ProjectPage } from "@/components/workspace/projectPage";
import { FileList } from "@/components/workspace/FileList";
import { Uploader } from "@/components/workspace/Uploader";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(`/portal/projects/${id}/files`);
  return <ProjectPage user={user} id={id} area="portal" tab="/files">{async (project) => (<div className="grid gap-6 lg:grid-cols-12"><div className="lg:col-span-8"><FileList files={await listFiles(user, { projectId: project.id })} staff={false} currentUserId={user.id} /></div><div className="lg:col-span-4"><Uploader projectId={project.id} /></div></div>)}</ProjectPage>;
}
