import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { homeFor, isStaff, type Actor } from "./permissions";
import type { Role } from "../db/schema";

export type SessionUser = Actor & {
  name: string; email: string; image: string | null; emailVerified: boolean; title: string | null; timezone: string | null;
  username: string | null; publicSlug: string | null; publicProfile: boolean; displayName: string | null; avatarKey: string | null; mustChangePassword: boolean;
};

function toActor(u: Record<string, unknown>): SessionUser {
  return {
    id: String(u.id),
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    image: (u.image as string | null) ?? null,
    emailVerified: Boolean(u.emailVerified),
    role: (u.role as Role) ?? "client_member",
    organisationId: (u.organisationId as string | null) ?? null,
    disabled: Boolean(u.disabled),
    title: (u.title as string | null) ?? null,
    timezone: (u.timezone as string | null) ?? null,
    username: (u.username as string | null) ?? null,
    publicSlug: (u.publicSlug as string | null) ?? null,
    publicProfile: Boolean(u.publicProfile),
    displayName: (u.displayName as string | null) ?? null,
    avatarKey: (u.avatarKey as string | null) ?? null,
    mustChangePassword: Boolean(u.mustChangePassword),
  };
}

/** Current user or null. Reads the session cookie server-side. */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Read the request headers before touching the auth instance: during a build
  // prerender, headers() bails out of static generation and auth is never created.
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const u = toActor(session.user as unknown as Record<string, unknown>);
  if (u.disabled) return null;
  return u;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403 | 404 | 422, message: string) { super(message); }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError(401, "Sign in required.");
  return u;
}

export async function requireStaff(): Promise<SessionUser> {
  const u = await requireUser();
  if (!isStaff(u)) throw new AuthError(403, "Staff access required.");
  return u;
}

/** For pages and layouts: redirects to sign-in, preserving the destination. */
export async function requirePageUser(next: string): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  // A temporary (bootstrap) password must be replaced before anything else is used.
  const profilePath = `${homeFor(u)}/profile`;
  if (u.mustChangePassword && !next.startsWith(profilePath)) redirect(`${profilePath}?password=required`);
  return u;
}
