// Authenticated product QA: login, portal, admin, isolation, request flow with realtime.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = "/tmp/claude-0/-home-user-pixfortech/b9fe4a5d-cca4-5894-8a93-ccba0580142b/scratchpad/shots/app";
mkdirSync(out, { recursive: true });
const PASSWORD = "forge-demo-2026!";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const errors = [];
const W = Number(process.env.W ?? 1366);
async function login(email, vw = W) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vw < 800 ? 812 : 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${email}] console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => errors.push(`[${email}] pageerror: ${e.message}`));
  await page.goto(base + "/login", { waitUntil: "load", timeout: 90000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => /\/(portal|admin)/.test(u.pathname), { timeout: 20000 });
  await page.waitForLoadState("load");
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}-${W}.png`, fullPage: process.env.FULL ? true : false });

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
await pm.page.goto(base + "/portal", { waitUntil: "load" }); console.log("pm -> /portal lands on", pm.page.url().replace(base, ""));
// Isolation: client A must not see client B's project (find B's project id via admin)
await pm.page.goto(base + "/admin/projects", { waitUntil: "load" });
const links = await pm.page.locator("a[href^='/admin/projects/']").evaluateAll((as) => as.map((x) => x.getAttribute("href")));
const ids = [...new Set(links.map((h) => h.split("/")[3]).filter(Boolean))];
const aId = projA.split("/")[3];
let isolation = "n/a";
for (const id of ids) {
  if (id === aId) continue;
  const r = await a.page.goto(base + `/portal/projects/${id}`, { waitUntil: "load" });
  const status = r?.status();
  const text = await a.page.textContent("body");
  if (status === 404 || /misplaced|not found/i.test(text ?? "")) { isolation = `project ${id.slice(0, 8)} -> 404 ✓`; } else { isolation = `LEAK project ${id} visible (${status})`; }
  if (isolation.startsWith("LEAK")) break;
}
console.log("client A -> other projects:", isolation, "| checked", ids.length - 1);
// API isolation: file download and request detail for foreign ids
const foreignReq = await pm.page.evaluate(async () => { const r = await fetch("/api/search?q=CSV"); const j = await r.json(); return j.requests?.[0]?.id; });
if (foreignReq) { const r = await a.page.goto(base + `/portal/requests/${foreignReq}`, { waitUntil: "load" }); console.log("client A -> client B request:", r?.status(), /misplaced|not found/i.test((await a.page.textContent("body")) ?? "") ? "404 ✓" : "VISIBLE ✗"); }

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
// PM opens the request (via toast link) and moves it to Under review; client sees live update
const reqUrl = a.page.url().replace(base, "").replace("/portal", "/admin");
await pm.page.goto(base + reqUrl, { waitUntil: "load" });
await pm.page.getByRole("button", { name: "Under review" }).click();
await pm.page.waitForTimeout(800);
await shot(pm.page, "admin-request");
await a.page.waitForFunction(() => document.body.innerText.includes("is now Under review") || document.body.innerText.includes("Under review"), null, { timeout: 8000 }).then(() => console.log("client sees Under review live ✓")).catch(() => console.log("client did not update ✗"));
// PM internal note must not reach client
await pm.page.getByLabel("Comment").fill("INTERNAL-ONLY-NOTE 4711");
await pm.page.getByRole("checkbox", { name: /Internal note/ }).check();
await pm.page.getByRole("button", { name: "Add internal note" }).click();
await pm.page.waitForTimeout(800);
await a.page.reload({ waitUntil: "load" });
console.log("internal note hidden from client:", !(await a.page.textContent("body"))?.includes("INTERNAL-ONLY-NOTE") ? "✓" : "LEAK ✗");
// Chat realtime
await a.page.goto(base + projA + "/messages", { waitUntil: "load" });
await pm.page.goto(base + projA.replace("/portal", "/admin") + "/messages", { waitUntil: "load" });
await pm.page.getByLabel("Message").fill("Live message from the PM at " + Date.now());
await pm.page.getByRole("button", { name: "Send" }).click();
await a.page.waitForFunction(() => document.body.innerText.includes("Live message from the PM"), null, { timeout: 8000 }).then(() => console.log("client chat live ✓")).catch(() => console.log("client chat not live ✗"));
await shot(a.page, "portal-chat-live");
// Sign out
await pm.page.getByRole("button", { name: "Sign out" }).click();
await pm.page.waitForURL(/\/login/, { timeout: 10000 }).then(() => console.log("sign out ✓"));
await a.ctx.close(); await pm.ctx.close(); await browser.close();
if (errors.length) console.log("ERRORS:\n" + [...new Set(errors)].slice(0, 12).join("\n"));
