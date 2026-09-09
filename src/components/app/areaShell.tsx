import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "./AppShell";
import { RealtimeProvider } from "./RealtimeProvider";
import { getSessionUser, type SessionUser } from "@/server/auth/session";
import { isStaff, homeFor } from "@/server/auth/permissions";
import { listNotifications, unreadCount } from "@/server/services/notifications";
import { unreadMessageCount } from "@/server/services/messages";
import { requestStats } from "@/server/services/requests";
import { listApprovals } from "@/server/services/approvals";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";

/** Server-side gate for an authenticated area. Redirects instead of rendering anything for the wrong role. */
export async function areaUser(area: "portal" | "admin", next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const staff = isStaff(user);
  if (area === "admin" && !staff) redirect(homeFor(user));
  if (area === "portal" && staff) redirect(homeFor(user));
  return user;
}

export async function AreaShell({ area, user, children }: { area: "portal" | "admin"; user: SessionUser; children: ReactNode }) {
  const [notifications, unread, unreadMessages, reqStats, pendingApprovals] = await Promise.all([
    (await listNotifications(user.id, 15)), (await unreadCount(user.id)), unreadMessageCount(user), requestStats(user), (await listApprovals(user, { status: "pending" })),
  ]);
  const org = user.organisationId ? (await db.select({ name: schema.organisations.name }).from(schema.organisations).where(eq(schema.organisations.id, user.organisationId)).limit(1))[0] : null;
  const nav: NavItem[] = area === "admin"
    ? [
        { href: "/admin", label: "Overview", icon: "home" },
        { href: "/admin/projects", label: "Projects", icon: "projects" },
        { href: "/admin/tasks", label: "Tasks", icon: "tasks" },
        { href: "/admin/requests", label: "Requests", icon: "requests", badge: reqStats.new || undefined },
        { href: "/admin/messages", label: "Messages", icon: "messages", badge: unreadMessages || undefined },
        { href: "/admin/files", label: "Files", icon: "files" },
        { href: "/admin/clients", label: "Clients", icon: "clients" },
        { href: "/admin/team", label: "Team", icon: "team" },
        { href: "/admin/activity", label: "Activity", icon: "activity" },
        { href: "/admin/notifications", label: "Notifications", icon: "bell", badge: unread || undefined },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
      ]
    : [
        { href: "/portal", label: "Overview", icon: "home" },
        { href: "/portal/projects", label: "Projects", icon: "projects" },
        { href: "/portal/requests", label: "Requests", icon: "requests", badge: reqStats.awaitingClient || undefined },
        { href: "/portal/approvals", label: "Approvals", icon: "approvals", badge: pendingApprovals.length || undefined },
        { href: "/portal/messages", label: "Messages", icon: "messages", badge: unreadMessages || undefined },
        { href: "/portal/files", label: "Files", icon: "files" },
        { href: "/portal/notifications", label: "Notifications", icon: "bell", badge: unread || undefined },
        { href: "/portal/profile", label: "Profile", icon: "profile" },
        { href: "/portal/settings", label: "Settings", icon: "settings" },
      ];
  return (
    <RealtimeProvider initialUnread={unread} area={area} userId={user.id}>
      <AppShell area={area} nav={nav} user={{ name: user.name, email: user.email, image: user.image, role: user.role, organisationName: org?.name ?? null }} notifications={notifications} searchLinks={nav.map((n) => ({ label: n.label, href: n.href }))}>
        {children}
      </AppShell>
    </RealtimeProvider>
  );
}
