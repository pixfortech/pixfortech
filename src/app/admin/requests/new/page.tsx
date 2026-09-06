import { requirePageUser } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";
import { Card, PageTitle } from "@/components/app/primitives";
import { RequestForm } from "@/components/workspace/RequestForm";
export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requirePageUser("/admin/requests/new");
  const { project } = await searchParams;
  return (<div className="max-w-3xl"><PageTitle eyebrow="Admin" title="Log a request" description="For requests that arrive by phone or email. The client sees it in their portal like any other." /><Card className="p-5 sm:p-6"><RequestForm projects={await listProjects(user)} area="admin" defaultProjectId={project} /></Card></div>);
}
