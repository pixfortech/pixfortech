import "server-only";

/**
 * Transactional email. Uses Resend when RESEND_API_KEY is configured;
 * otherwise logs to the server console (development) or fails loudly
 * (production), the same policy as the enquiry form.
 *
 * Failures carry Resend's own message so the server log says *why* a
 * message did not go out (for example the sandbox sender's recipient
 * restriction) instead of a bare status code. Successful sends log the
 * Resend message id, which is the handle for delivery status lookups
 * (`npm run email:check -- --status=<id>`). Addresses are never logged in full.
 */
export type EmailResult = { id: string | null; transport: "resend" | "console" };

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<EmailResult> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Pixel Forge <onboarding@resend.dev>", to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    });
    const body = await res.json().catch(() => null) as { id?: string; name?: string; message?: string } | null;
    if (!res.ok) {
      const detail = body?.message ? ` ${body.name ?? "error"}: ${body.message}` : "";
      console.error(`[email] resend rejected to=${maskAddress(input.to)} subject="${input.subject}" status=${res.status}${detail}`);
      throw new Error(`Email API responded ${res.status}.${detail}`);
    }
    console.info(`[email] resend accepted id=${body?.id ?? "unknown"} to=${maskAddress(input.to)} subject="${input.subject}"`);
    return { id: body?.id ?? null, transport: "resend" };
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[email] to=${input.to} subject="${input.subject}"\n${input.text}\n`);
    return { id: null, transport: "console" };
  }
  throw new Error("No email transport configured (RESEND_API_KEY).");
}

/** `owner@example.com` becomes `o***@example.com`: enough to correlate a log line, not enough to harvest. */
export function maskAddress(address: string): string {
  const at = address.indexOf("@");
  if (at <= 0) return "***";
  return `${address[0]}***${address.slice(at)}`;
}
