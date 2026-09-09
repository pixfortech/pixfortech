import { AuthError, requireUser } from "@/server/auth/session";
import { beginUpload, finishUpload, putChunk } from "@/server/services/chunked-uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).origin !== new URL(req.url).origin) return Response.json({ error: "Cross-origin uploads are not allowed." }, { status: 403 });
    const actor = await requireUser();
    const url = new URL(req.url);
    if (req.method === "PUT") {
      await putChunk(actor, url.searchParams.get("id") ?? "", Number(url.searchParams.get("part")), req);
      return Response.json({ ok: true });
    }
    if (url.searchParams.get("finish") === "1") return Response.json({ ok: true, file: await finishUpload(actor, url.searchParams.get("id") ?? "") });
    return Response.json({ ok: true, ...await beginUpload(actor, await req.json()) });
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ ok: false, error: error.message }, { status: error.status });
    return Response.json({ ok: false, error: "Upload failed." }, { status: 500 });
  }
}
export const POST = handle;
export const PUT = handle;
