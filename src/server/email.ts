import "server-only";
import { maskEmail } from "@/lib/mask-email";

/**
 * Transactional email. Uses Resend when RESEND_API_KEY is configured;
 * otherwise logs to the server console (development) or fails loudly
 * (production), the same policy as the enquiry form.
 *
 * Failures carry Resend's own message so the server log says *why* a
 * message did not go out (for example the sandbox sender's recipient
 * restriction) instead of a bare status code. Successful sends log the
 * Resend message id, which is the handle for delivery status lookups
 * (`npm run email:check -- --status=<id>`). Addresses are never logged in full
 * (first letter and domain only), and neither the API key nor the message
 * body (which carries verification and reset links) is logged by the
 * Resend path.
 */
export type EmailResult = { id: string | null; transport: "resend" | "console" };

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<EmailResult> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Pixel Forge <onboarding@resend.dev>", to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    }).catch((error: unknown) => {
      console.error(`[email] resend unreachable to=${maskEmail(input.to)} at=${new Date().toISOString()} subject="${input.subject}" ${error instanceof Error ? error.name : "error"}`);
      throw new Error("Email API unreachable.");
    });
    const body = await res.json().catch(() => null) as { id?: string; name?: string; message?: string } | null;
    if (!res.ok) {
      const detail = body?.message ? ` ${body.name ?? "error"}: ${body.message}` : "";
      console.error(`[email] resend rejected status=${res.status} to=${maskEmail(input.to)} at=${new Date().toISOString()} subject="${input.subject}"${detail}`);
      throw new Error(`Email API responded ${res.status}.${detail}`);
    }
    console.info(`[email] resend accepted id=${body?.id ?? "unknown"} to=${maskEmail(input.to)} at=${new Date().toISOString()} subject="${input.subject}"`);
    return { id: body?.id ?? null, transport: "resend" };
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[email] to=${input.to} subject="${input.subject}"\n${input.text}\n`);
    return { id: null, transport: "console" };
  }
  throw new Error("No email transport configured (RESEND_API_KEY).");
}

/** Masked address for logs; shared with the UI so both agree on the format. */
export { maskEmail as maskAddress } from "@/lib/mask-email";
