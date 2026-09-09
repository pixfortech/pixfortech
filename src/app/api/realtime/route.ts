import { getSessionUser } from "@/server/auth/session";
import { isStaff } from "@/server/auth/permissions";
import { accessibleProjectIds } from "@/server/services/access";
import { readEvents, type SubscriberScope } from "@/server/realtime/bus";
import { unreadCount } from "@/server/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every request rechecks the database session, role, tenant and project access.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const now = Date.now();
  const cursor = Number(new URL(req.url).searchParams.get("since"));
  const since = new Date(Math.max(now - 900_000, Math.min(now, Number.isFinite(cursor) && cursor > 0 ? cursor - 10_000 : now)));
  const scope: SubscriberScope = { userId: user.id, organisationId: user.organisationId, staff: isStaff(user), projectIds: new Set(await accessibleProjectIds(user)) };
  const [result, unread] = await Promise.all([readEvents(scope, since), unreadCount(user.id)]);
  return Response.json({ events: result.events.map((e) => ({ type: e.type, data: { ...e.payload, id: e.id, at: e.at } })), cursor: now, unread, resync: result.overflow }, { headers: { "cache-control": "private, no-store" } });
}
