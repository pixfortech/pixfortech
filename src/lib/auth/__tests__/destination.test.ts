import { describe, expect, it } from "vitest";
import { homeForRole, isRole, ROLES } from "../roles";
import { safeNext } from "../safe-next";
import { homeFor } from "@/server/auth/permissions";

describe("sign-in destination", () => {
  it("staff go to /admin and clients to /portal, the same rule the server uses", () => {
    for (const role of ["super_admin", "admin", "project_manager", "team_member"]) expect(homeForRole(role)).toBe("/admin");
    for (const role of ["client_admin", "client_member"]) expect(homeForRole(role)).toBe("/portal");
    for (const role of ROLES) expect(homeForRole(role)).toBe(homeFor({ id: "x", role, organisationId: null }));
  });
  it("unknown roles are not trusted as a destination hint", () => {
    expect(isRole("super_admin")).toBe(true);
    expect(isRole("root")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("safe next", () => {
  it.each(["/admin/projects", "/admin/projects/123", "/portal/project/xyz?tab=files#top", "/admin"])("keeps same-site path %s", (p) => {
    expect(safeNext(p)).toBe(p);
  });
  it.each([
    "//evil.example/x", "/\\evil.example", "https://evil.example", "http://evil.example/admin", "javascript:alert(1)",
    "/\t/evil.example", "/\n/evil.example", "evil.example", "", undefined, null, "/%2F%2Fevil.example".replace("%2F%2F", "//"), "\\\\evil.example",
  ])("refuses %j", (p) => {
    expect(safeNext(p as string | undefined)).toBeUndefined();
  });
  it.each(["/%2F%2Fevil.example", "/%2f%2fevil.example", "/%5Cevil.example", "/%09/evil.example", "/%E0%A4%A"])("refuses encoded trick %j", (p) => {
    expect(safeNext(p)).toBeUndefined();
  });
  it("keeps ordinary encoded characters", () => {
    expect(safeNext("/admin/projects?q=a%20b")).toBe("/admin/projects?q=a%20b");
  });
});
