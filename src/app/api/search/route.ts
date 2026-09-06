import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { search } from "@/server/services/directory";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return NextResponse.json(await search(user, q.slice(0, 80)));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
