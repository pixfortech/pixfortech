// Authenticated product QA: login, portal, admin, isolation, request flow with realtime.
import { launchBrowser, qaOutput, qaPassword } from "./qa-runtime.mjs";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const base = process.argv[2] ?? "http://localhost:3000";
const out = qaOutput("app");
mkdirSync(out, { recursive: true });
const PASSWORD = qaPassword();
const browser = await launchBrowser();
const errors = [];
const expectedErrors = new WeakMap();
const failures = [];
const report = console.log;
console.log = (...args) => {
  const message = args.join(" ");
  if (/✗|LEAK/.test(message)) failures.push(message);
  report(...args);
};
const W = Number(process.env.W ?? 1366);
async function login(email, vw = W) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vw < 800 ? 812 : 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const expected = (expectedErrors.get(page) ?? []).some(({ status, path }) =>
      m.text().includes(`status of ${status} `) && new URL(m.location().url || base).pathname === path);
    if (!expected) errors.push(`[${email}] console @${page.url()}: ${m.text().slice(0, 6000)}`);
  });
  page.on("pageerror", (e) => errors.push(`[${email}] pageerror: ${e.message}`));
  await page.goto(base + "/login", { waitUntil: "load", timeout: 90000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => /\/(portal|admin)/.test(u.pathname), { timeout: 20000 });
  await page.waitForLoadState("load");
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}-${W}.png`, caret: "initial", fullPage: process.env.FULL ? true : false });

// Unauthenticated redirect
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const res = await page.goto(base + "/admin", { waitUntil: "load" });
  console.log("anonymous /admin ->", page.url().replace(base, ""), res?.status());
  await shot(page, "login");
  await ctx.close();
}
// Client A
const a = await login("maya@northbank.test");
console.log("client login ->", a.page.url().replace(base, ""));
await shot(a.page, "portal-home");
await a.page.goto(base + "/portal/projects", { waitUntil: "load" });
const projA = await a.page.locator("a[href^='/portal/projects/']").first().getAttribute("href");
await a.page.goto(base + projA, { waitUntil: "load" }); await shot(a.page, "portal-project");
await a.page.goto(base + projA + "/messages", { waitUntil: "load" }); await shot(a.page, "portal-messages");
await a.page.goto(base + "/portal/approvals", { waitUntil: "load" }); await shot(a.page, "portal-approvals");
// Admin (PM)
const pm = await login("pm@pixelforge.test");
console.log("pm login ->", pm.page.url().replace(base, ""));
await shot(pm.page, "admin-home");
await pm.page.goto(base + "/admin/projects", { waitUntil: "load" }); await shot(pm.page, "admin-projects");
await pm.page.goto(base + "/admin/tasks", { waitUntil: "load" }); await shot(pm.page, "admin-tasks");
await pm.page.goto(base + "/admin/requests", { waitUntil: "load" }); await shot(pm.page, "admin-requests");
// Role gate: client cannot open admin; PM redirected away from portal
await a.page.goto(base + "/admin", { waitUntil: "load" }); console.log("client -> /admin lands on", a.page.url().replace(base, ""));
assert.equal(new URL(a.page.url()).pathname, "/portal");
await pm.page.goto(base + "/portal", { waitUntil: "load" }); console.log("pm -> /portal lands on", pm.page.url().replace(base, ""));
assert.equal(new URL(pm.page.url()).pathname, "/admin");
// Isolation: client A must not see client B's project (find B's project id via admin)
await pm.page.goto(base + "/admin/projects", { waitUntil: "load" });
const links = await pm.page.locator("a[href^='/admin/projects/']").evaluateAll((as) => as.map((x) => x.getAttribute("href")));
const ids = [...new Set(links.map((h) => h.split("/")[3]).filter((id) => id && id !== "new"))];
const aId = projA.split("/")[3];
let isolation = "n/a";
for (const id of ids) {
  if (id === aId) continue;
  expectedErrors.set(a.page, [{ status: 404, path: `/portal/projects/${id}` }]);
  const r = await a.page.goto(base + `/portal/projects/${id}`, { waitUntil: "load" });
  const status = r?.status();
  const text = await a.page.textContent("body");
  if (status === 404 || /misplaced|not found/i.test(text ?? "")) { isolation = `project ${id.slice(0, 8)} -> 404 ✓`; } else { isolation = `LEAK project ${id} visible (${status})`; }
  if (isolation.startsWith("LEAK")) break;
}
console.log("client A -> other projects:", isolation, "| checked", ids.length - 1);
assert.notEqual(isolation, "n/a", "Must exercise a foreign project");
// API isolation: file download and request detail for foreign ids
const foreignReq = await pm.page.evaluate(async () => { const r = await fetch("/api/search?q=CSV"); const j = await r.json(); return j.requests?.[0]?.id; });
if (foreignReq) {
  expectedErrors.set(a.page, [{ status: 404, path: `/portal/requests/${foreignReq}` }]);
  const r = await a.page.goto(base + `/portal/requests/${foreignReq}`, { waitUntil: "load" });
  assert.equal(r?.status(), 404, "Foreign requests must return 404");
  console.log("client A -> client B request:", r?.status(), /misplaced|not found/i.test((await a.page.textContent("body")) ?? "") ? "404 ✓" : "VISIBLE ✗");
}
expectedErrors.set(a.page, []);

// Realtime request flow: client submits, PM gets toast without refresh
await pm.page.goto(base + "/admin", { waitUntil: "load" });
await a.page.goto(base + "/portal/requests/new", { waitUntil: "load" });
await a.page.getByLabel("Title").fill("Make the footer clock show seconds");
await a.page.getByLabel("Description").fill("The studio time in the footer only shows hours and minutes. Seconds would be delightful and unnecessary.");
const toastWait = pm.page.waitForSelector("[role=status]:has-text('New change request')", { timeout: 15000 }).then(async () => { console.log("PM toast: received ✓"); await shot(pm.page, "admin-toast"); }).catch(() => console.log("PM toast: NOT received ✗"));
await a.page.getByRole("button", { name: "Submit request" }).click();
await a.page.waitForURL(/\/portal\/requests\/[a-f0-9-]+$/, { timeout: 20000 });
await a.page.waitForLoadState("load");
console.log("request created ->", a.page.url().replace(base, ""));
await toastWait;
await shot(a.page, "portal-request");
const unread = await pm.page.getByTestId("unread-count").textContent().catch(() => "0");
console.log("PM unread badge:", unread);
assert.ok(Number(unread) > 0, "New request must update unread count");
// PM opens the request (via toast link) and moves it to Under review; client sees live update
const reqUrl = a.page.url().replace(base, "").replace("/portal", "/admin");
await pm.page.goto(base + reqUrl, { waitUntil: "load" });
await pm.page.getByRole("button", { name: "Under review" }).click();
await pm.page.waitForFunction(() => document.querySelector("[data-testid='request-status']")?.textContent?.includes("Under review"), null, { timeout: 30000 });
await shot(pm.page, "admin-request");
await a.page.waitForFunction(() => document.querySelector("[data-testid='request-status']")?.textContent?.includes("Under review"), null, { timeout: 8000 }).then(() => console.log("client sees Under review live ✓")).catch(() => console.log("client did not update ✗"));
// PM internal note must not reach client
await pm.page.getByLabel("Comment").fill("INTERNAL-ONLY-NOTE 4711");
await pm.page.getByRole("checkbox", { name: /Internal note/ }).check();
await pm.page.getByRole("button", { name: "Add internal note" }).click();
await pm.page.waitForFunction(() => document.querySelector('textarea')?.value === "", null, { timeout: 30000 });
assert.ok((await pm.page.textContent("body"))?.includes("INTERNAL-ONLY-NOTE 4711"), "Internal comment must be saved before checking isolation");
await a.page.reload({ waitUntil: "load" });
console.log("internal note hidden from client:", !(await a.page.textContent("body"))?.includes("INTERNAL-ONLY-NOTE") ? "✓" : "LEAK ✗");
// Chat realtime
await a.page.goto(base + projA + "/messages", { waitUntil: "load" });
await pm.page.goto(base + projA.replace("/portal", "/admin") + "/messages", { waitUntil: "load" });
const liveText = "Live message from the PM at " + Date.now();
await pm.page.getByLabel("Message").fill(liveText);
await pm.page.getByRole("button", { name: "Send" }).click();
await pm.page.waitForFunction(() => document.querySelector('textarea[aria-label="Message"]')?.value === "", null, { timeout: 30000 });
await a.page.waitForFunction((t) => document.body.innerText.includes(t), liveText, { timeout: 8000 }).then(() => console.log("client chat live ✓")).catch(() => console.log("client chat not live ✗"));
await shot(a.page, "portal-chat-live");
// Sign out
expectedErrors.set(pm.page, [{ status: 401, path: "/api/realtime" }]);
await pm.page.getByRole("button", { name: "Sign out" }).click();
await pm.page.waitForURL(/\/login/, { timeout: 10000 }).then(() => console.log("sign out ✓"));
await a.ctx.close(); await pm.ctx.close(); await browser.close();
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].slice(0, 12).join("\n"));
assert.deepEqual(failures, [], "Product QA failures");
assert.deepEqual(errors, [], "Unexpected browser errors");
