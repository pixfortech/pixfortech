// Email-verification and footer QA against a local dev server started with
// REQUIRE_EMAIL_VERIFICATION=true and BETTER_AUTH_TRUSTED_ORIGINS=http://127.0.0.1:<port>.
// Creates one disposable account through the public sign-up endpoint and removes it
// afterwards (local databases only). Never point this at production.
//
//   node scripts/verification-qa.mjs http://localhost:3000 --log=<dev server log> [--untrusted=http://qa.localhost:3000]
// (start the dev server with QA_DEV_ORIGINS=qa.localhost so that origin can load the app)
//
// The dev server's console email transport prints verification links to its log;
// --log lets the suite open the link like a person would.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { launchBrowser, qaOutput } from "./qa-runtime.mjs";

const base = process.argv[2] ?? "http://localhost:3000";
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const devLog = arg("log");
const untrusted = arg("untrusted");
const twin = base.replace("localhost", "127.0.0.1");
if (!/^http:\/\/localhost:\d+$/.test(base)) throw new Error("verification-qa creates accounts; run it against a local dev server only.");
const out = qaOutput("verification");
const T = { timeout: 120000 };
const results = [];
const errors = [];
const ok = (name, pass, detail = "") => { results.push([name, pass]); console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); };
// Expected console noise: the refused sign-ins and the stubbed provider failure below.
const watch = (page, tag) => { page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`)); page.on("console", (m) => { if (m.type() === "error" && !/40[13]|429|502/.test(m.text())) errors.push(`[${tag}] ${m.text().slice(0, 160)}`); }); };

const tag = randomUUID().slice(0, 8);
const email = `verify-qa-${tag}@example.test`;
const password = `Disposable ${tag} password!`;
const browser = await launchBrowser();

async function signIn(page, origin = base) {
  await page.goto(origin + "/login", { waitUntil: "load", ...T });
  await page.waitForFunction(() => { const el = document.getElementById("email"); return el && !el.disabled; }, null, { timeout: 30000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
const clearSignInLimit = async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  await db.query(`DELETE FROM rate_limit WHERE key LIKE '%|/sign-in/email'`); await db.end();
};

try {
  // 1. Footer brand close at every breakpoint.
  for (const w of [1920, 1366, 1024, 768, 430, 390, 375, 320]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage(); watch(page, `footer-${w}`);
    await page.goto(base + "/", { waitUntil: "load", ...T });
    const el = page.getByTestId("footer-brand-close"); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    const m = await el.evaluate((node) => {
      const p = node.querySelector("p"); const box = node.getBoundingClientRect(); const mid = (box.left + box.right) / 2;
      const lines = [...p.children].map((l) => { const r = document.createRange(); r.selectNodeContents(l); const b = r.getBoundingClientRect(); return { left: b.left, right: b.right, off: Math.abs((b.left + b.right) / 2 - mid) }; });
      return { text: p.innerText.replace(/\s+/g, " ").trim(), lines, vw: innerWidth, docOver: document.documentElement.scrollWidth - document.documentElement.clientWidth, orange: [...p.querySelectorAll(".text-forge-500")].map((s) => s.textContent).join("") };
    });
    const fits = m.docOver <= 0 && m.lines.every((l) => l.left >= 0 && l.right <= m.vw && l.off <= 2);
    ok(`footer ${w}px: "EVERY PIXEL. ACCOUNTED FOR." centred, unclipped, orange punctuation`, fits && m.text === "EVERY PIXEL. ACCOUNTED FOR." && m.orange === "..", fits ? "" : JSON.stringify(m));
    if (w === 1366 || w === 320) await el.screenshot({ path: `${out}/footer-${w}.png` });
    await ctx.close();
  }
  const footerKept = await (async () => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "load", ...T }); const f = await page.locator("footer").innerText(); await ctx.close();
    return ["Pixel Forge Technologies", "Kolkata", "Navigate", "Studio", "Elsewhere", "Privacy", "Terms", "Client portal"].every((s) => f.toLowerCase().includes(s.toLowerCase())) && !/PIXEL\.FORGE/.test(f);
  })();
  ok("footer keeps its identity, links and portal entry; the old wordmark is gone", footerKept);

  // 2. A disposable unverified account.
  const signUp = await fetch(base + "/api/auth/sign-up/email", { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ name: "Verify QA", email, password, callbackURL: "/login?verified=1" }) });
  ok("disposable account created unverified", signUp.ok, `HTTP ${signUp.status}`);

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "unverified");
  await clearSignInLimit();
  await signIn(page);
  await page.getByTestId("login-unverified").waitFor({ timeout: 30000 });
  const unverifiedText = await page.getByTestId("login-unverified").innerText();
  ok("unverified sign-in: 'Your email still needs verifying.' with a resend button", /Your email still needs verifying\./.test(unverifiedText) && (await page.getByTestId("resend-verification-button").isEnabled()));
  ok("unverified sign-in: nothing claims a link was sent", !/sent you a new link|Verification email sent/i.test(unverifiedText) && (await page.getByTestId("login-error").count()) === 0);
  ok("unverified sign-in: PiP waits instead of scolding", (await page.getByTestId("auth-pip").getAttribute("data-emotion")) === "waiting");

  // Provider failure: the UI must not pretend.
  await page.route("**/api/auth/send-verification-email", (r) => r.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ code: "EMAIL_SEND_FAILED", message: "The verification email could not be sent." }) }));
  await page.getByTestId("resend-verification-button").click();
  await page.waitForFunction(() => document.querySelector('[data-testid="resend-status"]')?.dataset.status === "failed", null, { timeout: 15000 }).catch(() => undefined);
  const failed = await page.getByTestId("resend-status").innerText();
  ok("provider failure: 'We couldn't send that email right now.' and no sent claim", /couldn.t send that email right now/i.test(failed) && !/Verification email sent/.test(failed) && (await page.getByTestId("resend-verification-button").isEnabled()));
  await page.unroute("**/api/auth/send-verification-email");

  // Real resend, then cooldown.
  await page.getByTestId("resend-verification-button").click();
  await page.waitForFunction(() => document.querySelector('[data-testid="resend-status"]')?.dataset.status === "sent", null, { timeout: 15000 }).catch(() => undefined);
  const sentText = await page.getByTestId("resend-status").innerText();
  ok("resend: 'Verification email sent.' with a visible cooldown", /Verification email sent\./.test(sentText) && /Available again in (5\d|60) seconds/.test(sentText), sentText);
  ok("resend: button disabled during the cooldown", await page.getByTestId("resend-verification-button").isDisabled());
  const wait1 = Number(await page.getByTestId("resend-status").getAttribute("data-wait")); await page.waitForTimeout(2200);
  const wait2 = Number(await page.getByTestId("resend-status").getAttribute("data-wait"));
  ok("cooldown counts down", wait2 < wait1 && wait2 > 0, `${wait1} → ${wait2}`);
  const direct = await page.evaluate(async (e) => { const r = await fetch("/api/auth/send-verification-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: e }) }); return { status: r.status, body: await r.json().catch(() => null) }; }, email);
  ok("server enforces the cooldown too (429 RESEND_COOLDOWN)", direct.status === 429 && direct.body?.code === "RESEND_COOLDOWN", JSON.stringify(direct));
  await page.screenshot({ path: `${out}/login-unverified.png` });

  // Verify page with a masked address.
  await page.goto(`${base}/verify-email?email=${encodeURIComponent(email)}`, { waitUntil: "load", ...T }); await page.waitForTimeout(600);
  const sentTo = await page.getByTestId("verify-sent-to").innerText();
  ok("verify page: masked address, eyebrow, lead, cooldown carried over", sentTo.includes(`v***@example.test`) && !sentTo.includes(email) && /check your inbox/i.test(await page.getByTestId("auth-eyebrow").innerText()) && /One click and this pixel is officially yours\./.test(await page.textContent("body")) && (await page.getByTestId("resend-verification-button").isDisabled()));
  await page.screenshot({ path: `${out}/verify-page.png` });

  // 3. Open the verification link, then prove it sticks.
  let link = null;
  if (devLog) {
    const log = readFileSync(devLog, "utf8"); const block = log.slice(log.lastIndexOf(`[email] to=${email}`));
    link = /(http:\/\/\S+\/api\/auth\/verify-email\?token=\S+)/.exec(block)?.[1] ?? null;
  }
  ok("verification link captured from the dev transport", Boolean(link));
  if (link) {
    await page.goto(link, { waitUntil: "load", ...T });
    await page.waitForURL((u) => !u.pathname.startsWith("/api/"), { timeout: 60000 });
    ok("opening the link signs in and leaves the gate", !/\/login/.test(new URL(page.url()).pathname) || (await page.getByTestId("login-form").count()) === 0, page.url());
    const out1 = await page.evaluate(async () => (await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status);
    ok("sign out", out1 === 200);

    await clearSignInLimit();
    await signIn(page);
    const again = await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).then(() => true).catch(() => false);
    ok("sign in again after sign-out: straight through, no verification prompt", again && (await page.getByTestId("login-unverified").count()) === 0, page.url());
    await page.goto(base + "/verify-email", { waitUntil: "load", ...T });
    ok("verified session on /verify-email: 'Already verified', no resend", (await page.getByTestId("verify-already").count()) === 1 && (await page.getByTestId("resend-verification-button").count()) === 0);

    // A brand-new browser (fresh cookie jar) on the second trusted origin.
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } }); const fp = await fresh.newPage(); watch(fp, "second-origin");
    await clearSignInLimit();
    await signIn(fp, twin);
    const through = await fp.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).then(() => true).catch(() => false);
    ok("fresh session on a second trusted origin: verified, no prompt", through && (await fp.getByTestId("login-unverified").count()) === 0, fp.url());
    await fresh.close();
  }

  // 4. An origin the server does not trust is never reported as "verify your email".
  if (untrusted) {
    const u = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const up = await u.newPage(); watch(up, "untrusted");
    await clearSignInLimit();
    await signIn(up, untrusted);
    await up.getByTestId("login-error").waitFor({ timeout: 30000 }).catch(() => undefined);
    const msg = (await up.getByTestId("login-error").count()) ? await up.getByTestId("login-error").innerText() : "";
    ok("untrusted origin: an address message, never a verification prompt", /couldn.t sign you in from this address/i.test(msg) && (await up.getByTestId("login-unverified").count()) === 0, msg);
    await u.close();
  }
  await ctx.close();
} finally {
  await browser.close();
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
    const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
    const ids = (await db.query(`SELECT id FROM "user" WHERE email = $1`, [email])).rows.map((r) => r.id);
    for (const t of ["session", "account"]) await db.query(`DELETE FROM ${t} WHERE user_id = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
    await db.end();
    console.log(`  (disposable account removed: ${ids.length})`);
  } else console.log(`  Remove the disposable account ${email} by hand.`);
}

if (errors.length) console.log("Console errors:\n  " + errors.join("\n  "));
const failedCount = results.filter(([, p]) => !p).length;
console.log(`\n${results.length - failedCount}/${results.length} passed`);
process.exit(failedCount || errors.length ? 1 : 0);
