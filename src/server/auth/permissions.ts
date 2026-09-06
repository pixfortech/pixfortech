/**
 * Role-based permissions. Pure functions so they are unit-testable and so
 * the same rules run in services, actions and route handlers. Nothing here
 * is trusted from the browser; callers pass a server-side session user.
 */
import { CLIENT_ROLES, STAFF_ROLES, type Role } from "../db/schema";

export type Actor = { id: string; role: Role; organisationId: string | null; disabled?: boolean };

export const isStaff = (a: Actor) => STAFF_ROLES.includes(a.role);
export const isClient = (a: Actor) => CLIENT_ROLES.includes(a.role);
export const isAdmin = (a: Actor) => a.role === "super_admin" || a.role === "admin";
export const isSuperAdmin = (a: Actor) => a.role === "super_admin";
export const canManageProjects = (a: Actor) => isAdmin(a) || a.role === "project_manager";
export const canManageTeam = (a: Actor) => isAdmin(a);
export const canManageClients = (a: Actor) => isAdmin(a) || a.role === "project_manager";
export const canSeeInternal = (a: Actor) => isStaff(a);
export const canDecideApprovals = (a: Actor) => isClient(a);
export const canManageClientUsers = (a: Actor) => isAdmin(a) || a.role === "client_admin";

/** Whether an actor may access a project, given its organisation and explicit membership. */
export function canAccessProject(a: Actor, project: { organisationId: string; managerId: string | null }, isMember: boolean): boolean {
  if (a.disabled) return false;
  if (isAdmin(a)) return true;
  if (a.role === "project_manager") return true; // managers see the whole portfolio
  if (a.role === "team_member") return isMember || project.managerId === a.id;
  // clients: same organisation, and members only if explicitly assigned
  if (a.organisationId !== project.organisationId) return false;
  if (a.role === "client_admin") return true;
  return isMember;
}

/** Which request statuses an actor may move a request to. */
export function allowedRequestTransitions(a: Actor, current: string): string[] {
  const staff: Record<string, string[]> = {
    submitted: ["acknowledged", "under_review", "rejected"],
    acknowledged: ["under_review", "needs_clarification", "rejected"],
    under_review: ["needs_clarification", "estimated", "approved", "rejected"],
    needs_clarification: ["under_review", "cancelled"],
    estimated: ["approved", "rejected"],
    approved: ["scheduled", "in_progress"],
    scheduled: ["in_progress", "on_hold"],
    in_progress: ["ready_for_review", "blocked"],
    ready_for_review: ["changes_requested", "completed"],
    changes_requested: ["in_progress"],
    completed: ["closed"],
    closed: [],
    rejected: ["closed"],
    cancelled: ["closed"],
  };
  const client: Record<string, string[]> = {
    needs_clarification: ["under_review"], // answering a question re-opens review
    ready_for_review: ["changes_requested", "completed"], // approve or request changes
    submitted: ["cancelled"],
    acknowledged: ["cancelled"],
  };
  if (isStaff(a)) return staff[current] ?? [];
  return client[current] ?? [];
}

export const homeFor = (a: Actor) => (isStaff(a) ? "/admin" : "/portal");
