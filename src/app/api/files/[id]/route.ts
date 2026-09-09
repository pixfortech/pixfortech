import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { fileFor } from "@/server/services/files";
import { storage, verifyDownload } from "@/server/storage";

export const runtime = "nodejs";

/**
 * Protected download. Requires a session AND project access; an optional
 * signed token allows links copied inside the app to keep working for a
 * short time. S3 deployments redirect to a presigned URL; local storage
 * streams the object.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const file = await fileFor(user, id);
  if (!file) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (token && !verifyDownload(id, user.id, token)) return new Response("Expired link", { status: 403 });
  const inline = url.searchParams.get("inline") === "1" && (file.mime.startsWith("image/") || file.mime === "application/pdf") && file.mime !== "image/svg+xml";
  const presigned = await storage().presign(file.storageKey, file.name, file.mime, 300);
  if (presigned) {
    const response = NextResponse.redirect(presigned, 302);
    response.headers.set("cache-control", "private, no-store");
    response.headers.set("referrer-policy", "no-referrer");
    return response;
  }
  const obj = await storage().get(file.storageKey);
  if (!obj) return new Response("Missing object", { status: 404 });
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`;
  return new Response(obj.stream, {
    headers: {
      "content-type": file.mime === "image/svg+xml" ? "application/octet-stream" : file.mime,
      "content-length": String(obj.size),
      "content-disposition": disposition,
      "cache-control": "private, max-age=0, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
