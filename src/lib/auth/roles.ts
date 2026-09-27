/**
 * Roles and where each one lives. Pure (no database imports) so the sign-in
 * form can pick the destination from the sign-in response without a detour,
 * and the server's `homeFor` uses the very same rule.
 */
export const ROLES = ["super_admin", "admin", "project_manager", "team_member", "client_admin", "client_member"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: Role[] = ["super_admin", "admin", "project_manager", "team_member"];
export const CLIENT_ROLES: Role[] = ["client_admin", "client_member"];

export type Home = "/admin" | "/portal";
export const homeForRole = (role: string): Home => (STAFF_ROLES.includes(role as Role) ? "/admin" : "/portal");
/** True only for the six known roles; anything else means "ask the server". */
export const isRole = (value: unknown): value is Role => typeof value === "string" && (ROLES as readonly string[]).includes(value);
