import { NextResponse } from "next/server";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, enquirySchema, type EnquiryErrors } from "@/lib/enquiry-schema";
import { deliverEnquiry, type Attachment } from "@/lib/enquiry-delivery";

export const runtime = "nodejs";

/** Simple in-memory rate limit: 5 submissions per IP per 10 minutes. */
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ ok: false, message: "Too many submissions. Please try again in a few minutes." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid submission." }, { status: 400 });
  }

  const raw = Object.fromEntries(
    ["type", "summary", "budget", "timeline", "name", "company", "email", "phone", "website"].map((k) => [k, String(form.get(k) ?? "")]),
  );

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const errors: EnquiryErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof EnquiryErrors;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, message: "Please check the highlighted fields.", errors }, { status: 422 });
  }

  // Honeypot filled: pretend success, deliver nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  let attachment: Attachment | null = null;
  const file = form.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > ATTACHMENT_MAX_BYTES) {
      return NextResponse.json({ ok: false, message: "Attachment is too large (10 MB max).", errors: { attachment: "10 MB max." } }, { status: 422 });
    }
    if (file.type && !ATTACHMENT_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, message: "Unsupported attachment type.", errors: { attachment: "Use PDF, PNG, JPG, WEBP, ZIP or TXT." } }, { status: 422 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    attachment = { name: file.name, type: file.type, size: file.size, base64: buf.toString("base64") };
  }

  try {
    const result = await deliverEnquiry(parsed.data, attachment, { ip, userAgent: req.headers.get("user-agent") ?? "" });
    if (!result.ok) {
      console.error("[enquiry] delivery failed:", result.reason);
      return NextResponse.json({ ok: false, message: "We could not send your enquiry right now. Please email us directly." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[enquiry] unexpected error:", err);
    return NextResponse.json({ ok: false, message: "Something went wrong on our side. Please email us directly." }, { status: 500 });
  }
}
