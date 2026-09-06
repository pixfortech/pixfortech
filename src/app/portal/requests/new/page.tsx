import { requirePageUser } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";
import { Card, PageTitle } from "@/components/app/primitives";
import { RequestForm } from "@/components/workspace/RequestForm";

export default async function Page({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requirePageUser("/portal/requests/new");
  const { project } = await searchParams;
  const projects = await listProjects(user);
  return (
    <div className="max-w-3xl">
      <PageTitle eyebrow="Portal" title="Request a change" description="Tell us what should be different. We acknowledge every request and keep you posted at each step." />
      <Card className="p-5 sm:p-6"><RequestForm projects={projects} area="portal" defaultProjectId={project} /></Card>
    </div>
  );
}
