import "server-only";

/**
 * Transactional email. Uses Resend when RESEND_API_KEY is configured;
 * otherwise logs to the server console (development) or fails loudly
 * (production), the same policy as the enquiry form.
 */
export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Pixel Forge <onboarding@resend.dev>", to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    });
    if (!res.ok) throw new Error(`Email API responded ${res.status}`);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[email] to=${input.to} subject="${input.subject}"\n${input.text}\n`);
    return;
  }
  throw new Error("No email transport configured (RESEND_API_KEY).");
}
