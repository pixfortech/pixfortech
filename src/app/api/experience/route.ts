import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/auth/session";
import { db, schema } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in user's own PiP experience state. Small, capped, never shared. */
export async function GET() {
  try {
    const user = await requireUser();
    const [row] = await db.select({ experience: schema.users.experience }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
    return NextResponse.json({ experience: row?.experience ?? null }, { headers: { "cache-control": "private, no-store" } });
  } catch { return NextResponse.json({ experience: null }, { status: 401 }); }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as { shown?: Record<string, number>; games?: { played: string[]; offered: string[]; last: string | null }; hidden?: boolean; syncedAt?: number } | null;
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 });
    const shown: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.shown ?? {}).slice(0, 600)) if (/^[a-z]+(\.[a-z]+)*\.\d{1,3}$/i.test(k) && typeof v === "number") shown[k] = v;
    const games = body.games && Array.isArray(body.games.played) && Array.isArray(body.games.offered)
      ? { played: body.games.played.filter((g) => typeof g === "string").slice(0, 10), offered: body.games.offered.filter((g) => typeof g === "string").slice(0, 10), last: typeof body.games.last === "string" ? body.games.last : null }
      : undefined;
    const experience = { v: 2, shown, ...(games ? { games } : {}), hidden: Boolean(body.hidden), syncedAt: Date.now() };
    await db.update(schema.users).set({ experience }).where(eq(schema.users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }, { status: 401 }); }
}
