// Post-login navigation timing and routing QA against a local server with the demo fixtures.
// Measures, per sign-in: auth response → dashboard URL → dashboard content painted, and
// records every document/RSC navigation so an intermediate /redirect is visible.
//
//   QA_PASSWORD=… node scripts/login-timing-qa.mjs http://localhost:3100 [--runs=5] [--flows]
import { launchBrowser, qaOutput, qaPassword } from "./qa-runtime.mjs";

const base = process.argv[2] ?? "http://localhost:3100";
const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 5);
const flows = process.argv.includes("--flows");
const PASSWORD = qaPassword();
qaOutput("login-timing");
const browser = await launchBrowser();
const results = [];
const ok = (name, pass, detail = "") => { results.push([name, pass]); console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); };
const T = { timeout: 120000 };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn(page, email, path = "/login") {
  await page.goto(base + path, { waitUntil: "load", ...T });
  await page.waitForFunction(() => { const el = document.getElementById("password"); return el && !el.disabled; }, null, { timeout: 30000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const seen = [];
  const onReq = (r) => { const u = new URL(r.url()); if (u.origin === base && (r.isNavigationRequest() || (r.headers()["rsc"] === "1" && !r.headers()["next-router-prefetch"])) && !u.pathname.startsWith("/_next")) seen.push(u.pathname); };
  page.on("request", onReq);
  const authed = page.waitForResponse((r) => r.url().includes("/api/auth/sign-in/email"), T).then((r) => ({ at: performance.now(), status: r.status() }));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const auth = await authed;
  return { auth, seen, done: () => page.off("request", onReq) };
}

async function timeTo(page, email, expect, marker, path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { auth, seen, done } = await signIn(page, email, path);
    if (auth.status === 429) { done(); await pause(11000); continue; }
    await page.waitForURL((u) => u.pathname === expect, T);
    const urlAt = performance.now();
    await page.locator(marker).first().waitFor({ state: "visible", ...T });
    const paintAt = performance.now();
    done();
    return { url: Math.round(urlAt - auth.at), paint: Math.round(paintAt - auth.at), via: [...new Set(seen)] };
  }
  throw new Error("rate limited");
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

try {
  const staff = [];
  for (let i = 0; i < runs; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage();
    staff.push(await timeTo(page, "admin@pixelforge.test", "/admin", '[data-testid="quick-actions"]'));
    await ctx.close(); await pause(3500);
  }
  const via = [...new Set(staff.flatMap((s) => s.via))];
  console.log(`staff sign-in → /admin URL: median ${median(staff.map((s) => s.url))} ms; dashboard painted: median ${median(staff.map((s) => s.paint))} ms; runs ${staff.map((s) => s.paint).join("/")}`);
  console.log(`routes requested after sign-in: ${via.join(", ")}`);
  ok("A. staff lands on /admin without an intermediate /redirect", !via.includes("/redirect"), via.join(","));

  if (flows) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    const c = await timeTo(page, "maya@northbank.test", "/portal", "main");
    ok("B. client_member lands on /portal directly", !c.via.includes("/redirect"), `${c.paint} ms via ${c.via.join(",")}`);
    await ctx.close(); await pause(3500);

    const n = await browser.newContext(); const np = await n.newPage();
    const r = await timeTo(np, "admin@pixelforge.test", "/admin/projects", "main", "/login?next=/admin/projects");
    ok("C. a safe next goes straight there", !r.via.includes("/redirect"), `${r.paint} ms via ${r.via.join(",")}`);
    // D. sign out, sign in again in the same browser.
    await np.evaluate(() => fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
    await pause(3500);
    const again = await timeTo(np, "admin@pixelforge.test", "/admin", '[data-testid="quick-actions"]');
    ok("D. sign out then sign in: straight to the dashboard", !again.via.includes("/redirect"), `${again.paint} ms`);
    ok("G. verified user: no verification prompt", (await np.getByTestId("login-unverified").count()) === 0);
    await n.close(); await pause(3500);

    // E. every run above uses a brand-new context (no cookies, no storage): the private-window case.
    ok("E. fresh private context each run lands directly", staff.every((s) => !s.via.includes("/redirect")));

    // F. hostile next values never leave the site.
    for (const bad of ["//evil.example/x", "/\\evil.example", "https://evil.example", "/%2F%2Fevil.example", "javascript:alert(1)", "/\t/evil.example"]) {
      let x, xp, done;
      for (let attempt = 0; attempt < 4; attempt++) {
        x = await browser.newContext(); xp = await x.newPage();
        const r = await signIn(xp, "admin@pixelforge.test", `/login?next=${encodeURIComponent(bad)}`); done = r.done;
        if (r.auth.status !== 429) break;
        done(); await x.close(); await pause(11000);
      }
      await xp.waitForURL((u) => u.origin === base && !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => undefined);
      await pause(400);
      const u = new URL(xp.url());
      ok(`F. next=${JSON.stringify(bad)} stays on site (${u.pathname})`, u.origin === base && u.pathname === "/admin");
      done(); await x.close(); await pause(3500);
    }
    // Signed-in visitor opening /login with a hostile next is also kept on site (server redirect).
    const s = await browser.newContext(); const sp = await s.newPage();
    await timeTo(sp, "admin@pixelforge.test", "/admin", '[data-testid="quick-actions"]');
    await sp.goto(`${base}/login?next=${encodeURIComponent("//evil.example/x")}`, { waitUntil: "load", ...T });
    ok("F. signed-in /login?next=//evil stays on site", new URL(sp.url()).origin === base, sp.url());
    // The fallback router still works for magic links, Google and old bookmarks.
    const hop = await sp.request.get(`${base}/redirect`, { maxRedirects: 0 });
    ok("fallback /redirect answers with an immediate 307 to the dashboard (no page painted)", hop.status() === 307 && hop.headers().location === "/admin", `${hop.status()} → ${hop.headers().location}`);
    await s.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter(([, p]) => !p).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
