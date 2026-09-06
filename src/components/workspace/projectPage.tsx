import { notFound } from "next/navigation";
import type { SessionUser } from "@/server/auth/session";
import { getProject } from "@/server/services/projects";
import { ProjectHeader } from "./ProjectHeader";
import type { ReactNode } from "react";

/** Loads a project the user may see (404 otherwise) and renders the workspace header. */
export async function ProjectPage({ user, id, area, tab, actions, children }: { user: SessionUser; id: string; area: "portal" | "admin"; tab: string; actions?: ReactNode; children: (project: Awaited<ReturnType<typeof getProject>>) => Promise<ReactNode> | ReactNode }) {
  let project: Awaited<ReturnType<typeof getProject>>;
  try { project = await getProject(user, id); } catch { notFound(); }
  return (
    <div>
      <ProjectHeader project={project} area={area} current={tab} actions={actions} />
      {await children(project)}
    </div>
  );
}
