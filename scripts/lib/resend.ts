/**
 * Small Resend client for operator tooling. Reads RESEND_API_KEY from the
 * environment, never prints it, and returns Resend's own error text so a
 * refusal (sandbox recipient restriction, unverified sender domain, bad
 * key) is visible verbatim instead of as a bare status code.
 */
export type ResendSend = { ok: true; id: string } | { ok: false; status: number; name: string; message: string };
export type ResendStatus = { ok: true; id: string; lastEvent: string; to: string[]; from: string; subject: string; createdAt: string } | { ok: false; status: number; message: string };

const API = "https://api.resend.com";

function key(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY is not set in this environment.");
  return k;
}

export async function sendProbe(input: { to: string; from?: string; subject?: string; text?: string }): Promise<ResendSend> {
  const from = input.from ?? process.env.EMAIL_FROM ?? "Pixel Forge <onboarding@resend.dev>";
  const res = await fetch(`${API}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject ?? "Pixel Forge delivery check", text: input.text ?? `This is a delivery check from Pixel Forge tooling sent at ${new Date().toISOString()}. No action is needed.` }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };
  if (!res.ok || !body.id) return { ok: false, status: res.status, name: body.name ?? "error", message: body.message ?? "no message" };
  return { ok: true, id: body.id };
}

export async function getStatus(id: string): Promise<ResendStatus> {
  const res = await fetch(`${API}/emails/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${key()}` } });
  const body = (await res.json().catch(() => ({}))) as { id?: string; last_event?: string; to?: string[]; from?: string; subject?: string; created_at?: string; message?: string };
  if (!res.ok || !body.id) return { ok: false, status: res.status, message: body.message ?? "no message" };
  return { ok: true, id: body.id, lastEvent: body.last_event ?? "unknown", to: body.to ?? [], from: body.from ?? "", subject: body.subject ?? "", createdAt: body.created_at ?? "" };
}

/** Events that mean Resend has finished with the message, one way or the other. */
export const FINAL_EVENTS = new Set(["delivered", "bounced", "complained", "failed", "canceled"]);

/** Polls delivery status until Resend reports a final event or the time budget runs out. */
export async function waitForDelivery(id: string, budgetMs = 30_000, stepMs = 3_000): Promise<ResendStatus> {
  const until = Date.now() + budgetMs;
  let last = await getStatus(id);
  while (last.ok && !FINAL_EVENTS.has(last.lastEvent) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, stepMs));
    last = await getStatus(id);
  }
  return last;
}

/**
 * Asks the deployed application to send its own verification email for an
 * existing, unverified account through Better Auth's public endpoint. The
 * endpoint answers 200 whether or not the address exists (no enumeration),
 * so the definitive answer is the `[email] resend accepted id=` line in the
 * application's server log, followed by `--status=<id>`.
 */
export async function requestVerificationEmail(origin: string, email: string): Promise<{ status: number; body: string }> {
  const base = origin.replace(/\/$/, "");
  const res = await fetch(`${base}/api/auth/send-verification-email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email, callbackURL: "/login?verified=1" }),
  });
  return { status: res.status, body: (await res.text()).slice(0, 400) };
}
