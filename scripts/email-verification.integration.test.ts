// Email verification persistence against an isolated local PostgreSQL. The mail
// provider is replaced with a recorder; nothing leaves the machine.
import { requireIsolatedQaDatabase } from "./lib/qa-database";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";

requireIsolatedQaDatabase();

vi.hoisted(() => {
  process.env.REQUIRE_EMAIL_VERIFICATION = "true";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  // A second, explicitly trusted origin stands in for "temporary URL vs primary domain".
  process.env.BETTER_AUTH_TRUSTED_ORIGINS = "http://127.0.0.1:3000";
});
const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string }[]);
const failNext = vi.hoisted(() => ({ on: false }));
vi.mock("../src/server/email", () => ({
  sendEmail: vi.fn(async (m: { to: string; subject: string; text: string }) => {
    if (failNext.on) { failNext.on = false; throw new Error("provider rejected"); }
    sent.push(m);
    return { id: `test-${sent.length}`, transport: "test" };
  }),
  maskAddress: (s: string) => s,
}));

const { auth } = await import("../src/server/auth/auth");
const { db, schema } = await import("../src/server/db");
const { resendKey } = await import("../src/server/auth/resend-cooldown");

const tag = randomUUID().slice(0, 8);
const email = `verify-${tag}@example.test`;
const password = `Correct horse ${tag}!`;
const verifications = () => sent.filter((m) => m.to === email && /Verify/.test(m.subject));
const tokenFrom = (text: string) => /[?&]token=([^&\s]+)/.exec(text)?.[1] ?? "";
const clearCooldown = () => db.delete(schema.rateLimit).where(eq(schema.rateLimit.key, resendKey(email)));
const errorOf = async (p: Promise<unknown>) => p.then(() => { throw new Error("expected a rejection"); }, (e: { statusCode?: number; status?: string; body?: { code?: string } }) => e);

function post(path: string, body: unknown, origin: string, cookie?: string) {
  return auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
    method: "POST",
    // What a browser's fetch() sends: Better Auth enforces the origin list whenever Fetch Metadata or a cookie is present.
    headers: { "content-type": "application/json", origin, "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors", "sec-fetch-dest": "empty", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  }));
}
const sessionCookie = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.includes("session_token=") && !c.endsWith("=")) ?? "";
async function sessionFor(cookie: string) {
  return auth.api.getSession({ headers: new Headers({ cookie }) });
}

let userId = "";
beforeAll(async () => {
  await auth.api.signUpEmail({ body: { name: "Verify Tester", email, password, callbackURL: "/login?verified=1" } });
  userId = (await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)))[0].id;
});
beforeEach(() => { failNext.on = false; });
afterAll(async () => {
  await db.delete(schema.rateLimit).where(like(schema.rateLimit.key, "verify-resend:%"));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
  await db.delete(schema.users).where(inArray(schema.users.id, [userId]));
});

describe("before verification", () => {
  it("sign-up sends exactly one verification email", () => {
    expect(verifications()).toHaveLength(1);
    expect(tokenFrom(verifications()[0].text)).not.toBe("");
  });
  it("an unverified sign-in is refused as EMAIL_NOT_VERIFIED and mails nothing", async () => {
    const e = await errorOf(auth.api.signInEmail({ body: { email, password } }));
    expect(e.statusCode).toBe(403);
    expect(e.body?.code).toBe("EMAIL_NOT_VERIFIED");
    expect(verifications()).toHaveLength(1);
  });
  it("a provider failure is reported, not swallowed, and does not start the cooldown", async () => {
    await clearCooldown();
    failNext.on = true;
    const e = await errorOf(auth.api.sendVerificationEmail({ body: { email, callbackURL: "/login?verified=1" } }));
    expect(e.statusCode).toBe(502);
    expect(e.body?.code).toBe("EMAIL_SEND_FAILED");
    expect(verifications()).toHaveLength(1);
    // Retry is allowed straight away after a failure.
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/login?verified=1" } });
    expect(verifications()).toHaveLength(2);
  });
  it("a second resend inside the minute is refused with the time left", async () => {
    const e = await errorOf(auth.api.sendVerificationEmail({ body: { email: email.toUpperCase(), callbackURL: "/login?verified=1" } }));
    expect(e.statusCode).toBe(429);
    expect(e.body?.code).toBe("RESEND_COOLDOWN");
    expect(verifications()).toHaveLength(2);
  });
});

describe("after verification", () => {
  beforeAll(async () => {
    const token = tokenFrom(verifications().at(-1)!.text);
    await auth.api.verifyEmail({ query: { token } });
  });
  // The HTTP sign-in limiter (3 per 10 s) is not under test here; start each case with a clean window.
  beforeEach(() => db.delete(schema.rateLimit).where(like(schema.rateLimit.key, "%|/sign-in/email")));

  it("the row is verified", async () => {
    const [u] = await db.select({ v: schema.users.emailVerified }).from(schema.users).where(eq(schema.users.id, userId));
    expect(u.v).toBe(true);
  });

  it("sign in, sign out, sign in again: still verified, no new email, fresh session each time", async () => {
    const before = verifications().length;
    const first = await post("/sign-in/email", { email, password }, "http://localhost:3000");
    expect(first.status).toBe(200);
    const c1 = sessionCookie(first);
    expect((await sessionFor(c1))?.user.emailVerified).toBe(true);

    const out = await post("/sign-out", {}, "http://localhost:3000", c1);
    expect(out.status).toBe(200);
    expect(await sessionFor(c1)).toBeNull();

    const second = await post("/sign-in/email", { email, password }, "http://localhost:3000");
    expect(second.status).toBe(200);
    const c2 = sessionCookie(second);
    expect(c2).not.toBe(c1);
    expect((await sessionFor(c2))?.user.emailVerified).toBe(true);
    expect(verifications()).toHaveLength(before);
  });

  it("the verified state holds on a second trusted origin with its own session", async () => {
    const res = await post("/sign-in/email", { email, password }, "http://127.0.0.1:3000");
    expect(res.status).toBe(200);
    expect((await sessionFor(sessionCookie(res)))?.user.emailVerified).toBe(true);
  });

  it("an untrusted origin is refused as INVALID_ORIGIN, never as unverified", async () => {
    const res = await post("/sign-in/email", { email, password }, "https://not-this-site.example");
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).not.toBe("EMAIL_NOT_VERIFIED");
    expect(body.code).toMatch(/ORIGIN/);
  });

  it("a verified address gets no verification email on resend", async () => {
    await clearCooldown();
    const before = verifications().length;
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/login?verified=1" } });
    expect(verifications()).toHaveLength(before);
  });

  it("the session policy is unchanged: 14-day sessions refreshed daily", () => {
    const opts = auth.options.session!;
    expect(opts.expiresIn).toBe(60 * 60 * 24 * 14);
    expect(opts.updateAge).toBe(60 * 60 * 24);
    expect(auth.options.emailVerification?.sendOnSignIn).toBe(false);
  });
});
