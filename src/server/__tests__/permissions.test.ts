import { describe, expect, it } from "vitest";
import { allowedRequestTransitions, canAccessProject, homeFor, type Actor } from "../auth/permissions";

const actor = (role: Actor["role"], organisationId: string | null = null, extra: Partial<Actor> = {}): Actor => ({ id: `u-${role}`, role, organisationId, ...extra });
const project = { organisationId: "org-a", managerId: "u-project_manager" };

describe("canAccessProject", () => {
  it("lets admins and project managers see every project", () => {
    expect(canAccessProject(actor("super_admin"), project, false)).toBe(true);
    expect(canAccessProject(actor("admin"), project, false)).toBe(true);
    expect(canAccessProject(actor("project_manager"), project, false)).toBe(true);
  });
  it("restricts team members to projects they are assigned to or manage", () => {
    expect(canAccessProject(actor("team_member"), project, false)).toBe(false);
    expect(canAccessProject(actor("team_member"), project, true)).toBe(true);
    expect(canAccessProject({ id: "u-project_manager", role: "team_member", organisationId: null }, project, false)).toBe(true);
  });
  it("never lets a client see another organisation's project", () => {
    expect(canAccessProject(actor("client_admin", "org-b"), project, true)).toBe(false);
    expect(canAccessProject(actor("client_member", "org-b"), project, true)).toBe(false);
    expect(canAccessProject(actor("client_admin", null), project, true)).toBe(false);
  });
  it("gives client admins all of their organisation's projects and members only assigned ones", () => {
    expect(canAccessProject(actor("client_admin", "org-a"), project, false)).toBe(true);
    expect(canAccessProject(actor("client_member", "org-a"), project, false)).toBe(false);
    expect(canAccessProject(actor("client_member", "org-a"), project, true)).toBe(true);
  });
  it("blocks disabled accounts regardless of role", () => {
    expect(canAccessProject(actor("super_admin", null, { disabled: true }), project, true)).toBe(false);
  });
});

describe("allowedRequestTransitions", () => {
  it("only lets staff move a request through the pipeline", () => {
    expect(allowedRequestTransitions(actor("project_manager"), "submitted")).toEqual(["acknowledged", "under_review", "rejected"]);
    expect(allowedRequestTransitions(actor("client_admin", "org-a"), "under_review")).toEqual([]);
  });
  it("lets clients cancel early, answer clarifications and sign off on review", () => {
    expect(allowedRequestTransitions(actor("client_member", "org-a"), "submitted")).toEqual(["cancelled"]);
    expect(allowedRequestTransitions(actor("client_member", "org-a"), "needs_clarification")).toEqual(["under_review"]);
    expect(allowedRequestTransitions(actor("client_admin", "org-a"), "ready_for_review")).toEqual(["changes_requested", "completed"]);
  });
  it("treats closed as terminal and unknown states as dead ends", () => {
    expect(allowedRequestTransitions(actor("admin"), "closed")).toEqual([]);
    expect(allowedRequestTransitions(actor("admin"), "nonsense")).toEqual([]);
  });
});

describe("homeFor", () => {
  it("sends staff to admin and clients to the portal", () => {
    expect(homeFor(actor("team_member"))).toBe("/admin");
    expect(homeFor(actor("client_member", "org-a"))).toBe("/portal");
  });
});
