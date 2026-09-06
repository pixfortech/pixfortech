import { getSessionUser } from "@/server/auth/session";
import { isStaff } from "@/server/auth/permissions";
import { accessibleProjectIds } from "@/server/services/access";
import { matches, subscribe, type SubscriberScope } from "@/server/realtime/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream. One connection per tab; events are filtered
 * server-side by the user's projects, organisation and staff status so a
 * client never receives another tenant's events. Heartbeats keep proxies
 * from closing the stream; the browser reconnects automatically.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const projectIds = new Set(await accessibleProjectIds(user));
  const scope: SubscriberScope = { userId: user.id, organisationId: user.organisationId, staff: isStaff(user), projectIds };
  const encoder = new TextEncoder();
  let cleanup = () => undefined as void;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (name: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      };
      send("ready", { at: Date.now() });
      const unsub = subscribe((e) => { if (matches(e, scope)) send(e.type, { id: e.id, at: e.at, ...e.payload }); });
      const beat = setInterval(() => { try { controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`)); } catch { /* closed */ } }, 25000);
      // Project membership can change while a tab stays open; refresh the scope so
      // added projects start streaming and removed ones stop within a minute.
      const rescope = setInterval(() => { accessibleProjectIds(user).then((ids) => { scope.projectIds = new Set(ids); }).catch(() => undefined); }, 60000);
      cleanup = () => { unsub(); clearInterval(beat); clearInterval(rescope); };
      req.signal.addEventListener("abort", () => { cleanup(); try { controller.close(); } catch { /* already closed */ } });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
