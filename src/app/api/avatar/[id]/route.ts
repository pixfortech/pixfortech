import { getSessionUser } from "@/server/auth/session";
import { avatarFor } from "@/server/services/profile";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves a profile image. Published staff avatars are public and cached;
 * everyone else's is private to people who work with them. Unknown or
 * forbidden ids answer 404 so the route cannot be used to enumerate users.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) return new Response("Not found", { status: 404 });
  const viewer = await getSessionUser();
  const avatar = await avatarFor(viewer, id);
  if (!avatar) return new Response("Not found", { status: 404 });
  const presigned = await storage().presign(avatar.key, "avatar", avatar.mime, avatar.isPublic ? 86_400 : 600);
  const cache = avatar.isPublic ? "public, max-age=86400, stale-while-revalidate=604800" : "private, no-store";
  if (presigned) return Response.redirect(presigned, 302);
  const obj = await storage().get(avatar.key);
  if (!obj) return new Response("Not found", { status: 404 });
  void req;
  return new Response(obj.stream, { headers: { "content-type": avatar.mime, "content-length": String(obj.size), "cache-control": cache, "x-content-type-options": "nosniff", "content-disposition": "inline" } });
}
