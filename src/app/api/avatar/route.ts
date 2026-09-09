import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { AVATAR_MAX_BYTES, removeAvatar, setAvatar } from "@/server/services/profile";

export const runtime = "nodejs";

/** Upload (POST) or remove (DELETE) the signed-in user's avatar, or an admin acting on a staff member with ?user=. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const origin = req.headers.get("origin"), host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ ok: false, error: "Cross-origin uploads are not allowed." }, { status: 403 });
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an image." }, { status: 400 });
    if (file.size > AVATAR_MAX_BYTES) return NextResponse.json({ ok: false, error: "Keep it under 2 MB." }, { status: 413 });
    const targetId = String(form.get("userId") || user.id);
    const url = await setAvatar(user, targetId, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    console.error("[avatar]", err);
    return NextResponse.json({ ok: false, error: "Upload failed." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const targetId = new URL(req.url).searchParams.get("user") || user.id;
    await removeAvatar(user, targetId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    return NextResponse.json({ ok: false, error: "Could not remove the image." }, { status: 500 });
  }
}
