import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireUser } from "@/server/auth/session";
import { MAX_FILE_BYTES, storeFile } from "@/server/services/files";
import { recordAudit } from "@/server/services/activity";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();
function limited(key: string, max = 40, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(key, list);
  return list.length > max;
}

const meta = z.object({ projectId: z.string().min(1), taskId: z.string().optional(), requestId: z.string().optional(), messageId: z.string().optional(), approvalId: z.string().optional(), clientVisible: z.enum(["true", "false"]).optional(), supersedesId: z.string().optional() });

/** Multipart upload: validated, scanned, stored privately, recorded. Same-origin only. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ ok: false, error: "Cross-origin uploads are not allowed." }, { status: 403 });
    if (limited(user.id)) return NextResponse.json({ ok: false, error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
    const form = await req.formData();
    const parsed = meta.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid upload target." }, { status: 400 });
    const results: unknown[] = [];
    const filesIn = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!filesIn.length) return NextResponse.json({ ok: false, error: "No files received." }, { status: 400 });
    if (filesIn.length > 10) return NextResponse.json({ ok: false, error: "Upload at most ten files at once." }, { status: 400 });
    for (const f of filesIn) {
      if (f.size > MAX_FILE_BYTES) return NextResponse.json({ ok: false, error: `${f.name} is over 25 MB.` }, { status: 413 });
      const buf = Buffer.from(await f.arrayBuffer());
      const stored = await storeFile(user, { ...parsed.data, clientVisible: parsed.data.clientVisible ? parsed.data.clientVisible === "true" : undefined }, f.name, f.type, buf);
      results.push(stored);
    }
    recordAudit({ actorId: user.id, action: "file.upload", targetType: "project", targetId: parsed.data.projectId, metadata: { count: results.length }, ip: req.headers.get("x-forwarded-for") });
    return NextResponse.json({ ok: true, files: results });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    console.error("[upload]", err);
    return NextResponse.json({ ok: false, error: "Upload failed." }, { status: 500 });
  }
}
