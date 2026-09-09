import { requirePageUser } from "@/server/auth/session";
import { listFiles } from "@/server/services/files";
import { listProjects } from "@/server/services/projects";
import { PageTitle } from "@/components/app/primitives";
import { FileList } from "@/components/workspace/FileList";
import { Filters } from "@/components/workspace/Filters";
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requirePageUser("/admin/files");
  const { project } = await searchParams;
  const [files, projects] = await Promise.all([(await listFiles(user, { projectId: project })), (await listProjects(user))]);
  return (<div><PageTitle eyebrow="Admin" title="Files" description="Every upload across every project, newest first." /><Filters fields={[{ name: "project", label: "Project", options: projects.map((p) => ({ value: p.id, label: p.code })) }]} /><FileList files={files} staff currentUserId={user.id} showProject /></div>);
}
