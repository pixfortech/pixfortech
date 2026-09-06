import { requirePageUser } from "@/server/auth/session";
import { listProjects } from "@/server/services/projects";
import { PageTitle } from "@/components/app/primitives";
import { ProjectCards } from "@/components/workspace/lists";

export default async function PortalProjects() {
  const user = await requirePageUser("/portal/projects");
  const projects = await listProjects(user);
  return (<div><PageTitle eyebrow="Portal" title="Projects" description="Everything the studio is building for you." /><ProjectCards projects={projects} area="portal" /></div>);
}
