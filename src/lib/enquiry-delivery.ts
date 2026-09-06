import "server-only";
import type { EnquiryInput } from "./enquiry-schema";
import { BUDGETS, PROJECT_TYPES, TIMELINES, labelFor } from "./enquiry-schema";

export type Attachment = { name: string; type: string; size: number; base64: string };

export type DeliveryResult = { ok: true; via: "webhook" | "resend" | "log" } | { ok: false; reason: string };

function summarise(data: EnquiryInput): string {
  return [
    `New project enquiry`,
    ``,
    `Type: ${labelFor(PROJECT_TYPES, data.type)}`,
    `Budget: ${labelFor(BUDGETS, data.budget)}`,
    `Timeline: ${labelFor(TIMELINES, data.timeline)}`,
    ``,
    `Name: ${data.name}`,
    `Company: ${data.company || "-"}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "-"}`,
    ``,
    `Summary:`,
    data.summary,
  ].join("\n");
}

/**
 * Delivers an enquiry using whichever transport is configured:
 *  - ENQUIRY_WEBHOOK_URL: POST JSON (Zapier, Make, Slack, a CRM, your own endpoint)
 *  - RESEND_API_KEY + ENQUIRY_TO (+ optional ENQUIRY_FROM): email via Resend
 *  - otherwise, outside production, log to the server console.
 */
export async function deliverEnquiry(data: EnquiryInput, attachment: Attachment | null, meta: { ip: string; userAgent: string }): Promise<DeliveryResult> {
  const text = summarise(data);

  if (process.env.ENQUIRY_WEBHOOK_URL) {
    const res = await fetch(process.env.ENQUIRY_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, text, attachment, meta, receivedAt: new Date().toISOString() }),
    });
    if (!res.ok) return { ok: false, reason: `Webhook responded ${res.status}` };
    return { ok: true, via: "webhook" };
  }

  if (process.env.RESEND_API_KEY && process.env.ENQUIRY_TO) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.ENQUIRY_FROM ?? "Pixel Forge Website <onboarding@resend.dev>",
        to: [process.env.ENQUIRY_TO],
        reply_to: data.email,
        subject: `Enquiry: ${labelFor(PROJECT_TYPES, data.type)} from ${data.name}${data.company ? ` (${data.company})` : ""}`,
        text,
        ...(attachment ? { attachments: [{ filename: attachment.name, content: attachment.base64 }] } : {}),
      }),
    });
    if (!res.ok) return { ok: false, reason: `Email API responded ${res.status}` };
    return { ok: true, via: "resend" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[enquiry] No delivery transport configured. Logging enquiry:\n" + text + (attachment ? `\nAttachment: ${attachment.name} (${attachment.size} bytes)` : ""));
    return { ok: true, via: "log" };
  }

  return { ok: false, reason: "No enquiry delivery transport is configured." };
}
