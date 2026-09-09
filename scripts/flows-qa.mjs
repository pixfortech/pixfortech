// End-to-end checks for the remaining product flows: password reset via emailed link,
// password change, staff invitation, file upload + cross-tenant download, approvals, kanban drag.
import { launchBrowser, qaOutput, qaPassword } from "./qa-runtime.mjs";
import { mkdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const base = process.argv[2] ?? "http://localhost:3000";
const log = process.env.DEV_LOG ?? "data/deployment/dev.log";
const out = qaOutput("flows");
mkdirSync(out, { recursive: true });
const PASSWORD = qaPassword();
const browser = await launchBrowser();
const errors = [];
const expectedErrors = new WeakMap();
const results = [];
const ok = (name, pass, detail = "") => { results.push([name, pass, detail]); console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); };

async function fresh(email, password = PASSWORD) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const url = m.location().url ?? "";
    const expected = (expectedErrors.get(page) ?? []).some(({ status, path }) => m.text().includes(String(status)) && url.includes(path));
    if (!expected && !/404 \(Not Found\)|429 \(Too Many Requests\)/.test(m.text())) errors.push(`[${email}] ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => errors.push(`[${email}] pageerror: ${e.message}`));
  if (email) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.goto(base + "/login", { waitUntil: "load", timeout: 90000 });
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      const done = await page.waitForURL((u) => /\/(portal|admin)/.test(u.pathname), { timeout: 15000 }).then(() => true).catch(() => false);
      if (done) break;
      // The auth API rate-limits sign-in per IP (30 requests a minute); this script logs in a lot. Back off and retry.
      console.log(`  (sign-in for ${email} did not complete, waiting for the rate-limit window)`);
      await page.waitForTimeout(25000);
    }
    await page.waitForLoadState("load");
  }
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
function lastEmailLink(to, subjectRe, since) {
  const text = readFileSync(log, "utf8").slice(since);
  const chunks = text.split("[email] ").filter((c) => c.startsWith(`to=${to}`) && subjectRe.test(c));
  const last = chunks.at(-1);
  const m = last?.match(/https?:\/\/\S+/);
  return m?.[0] ?? null;
}
const logSize = () => readFileSync(log, "utf8").length;

// 1. Forgot password → emailed link → new password → sign in → change back from settings
{
  const since = logSize();
  const { ctx, page } = await fresh(null);
  await page.goto(base + "/forgot-password", { waitUntil: "load" });
  await page.getByLabel("Email").fill("tom@northbank.test");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/auth/request-password-reset") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Send reset link" }).click(),
  ]);
  const link = lastEmailLink("tom@northbank.test", /Reset your Pixel Forge password/, since);
  ok("reset email logged with link", !!link, link ? "link received (redacted)" : "no link found");
  if (link) {
    await page.goto(link, { waitUntil: "load" });
    await page.waitForURL(/reset-password/, { timeout: 15000 });
    const tmp = randomBytes(24).toString("base64url");
    await page.getByLabel("New password").fill(tmp);
    await page.getByLabel("Confirm password").fill(tmp);
    await page.getByRole("button", { name: "Save password" }).click();
    await page.waitForTimeout(2000);
    await shot(page, "reset-done");
    // reused link must fail
    const again = await page.goto(link, { waitUntil: "load" });
    const reused = /invalid or has expired/i.test((await page.textContent("body")) ?? "");
    ok("reset link is single-use", reused, `${again?.status()} ${new URL(page.url()).pathname}`);
    const oldLogin = await fresh(null);
    expectedErrors.set(oldLogin.page, [{ status: 401, path: "/api/auth/sign-in/email" }]);
    await oldLogin.page.goto(base + "/login", { waitUntil: "load" });
    await oldLogin.page.getByLabel("Email").fill("tom@northbank.test");
    await oldLogin.page.getByLabel("Password").fill(PASSWORD);
    await oldLogin.page.getByRole("button", { name: "Sign in" }).click();
    await oldLogin.page.waitForTimeout(2500);
    ok("old password rejected after reset", oldLogin.page.url().includes("/login"), oldLogin.page.url().replace(base, ""));
    await oldLogin.ctx.close();
    const tom = await fresh("tom@northbank.test", tmp);
    ok("sign in with new password", tom.page.url().includes("/portal"));
    await tom.page.goto(base + "/portal/profile", { waitUntil: "load" });
    await tom.page.getByLabel("Current password").fill(tmp);
    await tom.page.getByLabel("New password").fill(PASSWORD);
    await tom.page.getByRole("button", { name: "Change password" }).click();
    await tom.page.waitForTimeout(2000);
    const changedMsg = (await tom.page.textContent("body")) ?? "";
    await shot(tom.page, "password-changed");
    ok("password changed back from settings", /password (changed|updated)/i.test(changedMsg), changedMsg.match(/password (changed|updated)[^.]*/i)?.[0] ?? "no confirmation text");
    await tom.ctx.close();
    const back = await fresh("tom@northbank.test", PASSWORD);
    ok("sign in with restored password", back.page.url().includes("/portal"));
    await back.ctx.close();
  }
  await ctx.close();
}

// 2. Invite a team member → reset link → set password → lands in /admin
{
  const since = logSize();
  const email = `invitee-${Date.now()}@pixelforge.test`;
  const admin = await fresh("admin@pixelforge.test");
  await admin.page.goto(base + "/admin/team", { waitUntil: "load" });
  await admin.page.getByRole("button", { name: "Invite staff" }).click();
  const dlg = admin.page.getByRole("dialog");
  await dlg.getByLabel("Name").fill("Invited Person");
  await dlg.getByLabel("Email").fill(email);
  await dlg.getByLabel("Role", { exact: true }).selectOption("team_member");
  await dlg.getByRole("button", { name: "Send invitation" }).click();
  await admin.page.waitForTimeout(2500);
  const listed = (await admin.page.textContent("body"))?.includes("Invited Person");
  ok("invitee listed in team", !!listed);
  await shot(admin.page, "team-invited");
  const link = lastEmailLink(email, /Reset your Pixel Forge password/, since);
  ok("invitation email logged with link", !!link);
  if (link) {
    const p = await fresh(null);
    const verification = lastEmailLink(email, /Verify your Pixel Forge email/, since);
    ok("invitation includes email verification", !!verification);
    if (verification) await p.page.goto(verification, { waitUntil: "load" });
    await p.page.goto(link, { waitUntil: "load" });
    await p.page.waitForURL(/reset-password/, { timeout: 15000 });
    const invitedPassword = randomBytes(24).toString("base64url");
    await p.page.getByLabel("New password").fill(invitedPassword);
    await p.page.getByLabel("Confirm password").fill(invitedPassword);
    await p.page.getByRole("button", { name: "Save password" }).click();
    await p.page.waitForTimeout(2000);
    await p.ctx.close();
    const inv = await fresh(email, invitedPassword);
    ok("invitee signs in and lands in admin", inv.page.url().includes("/admin"), inv.page.url().replace(base, ""));
    // team member without project membership sees no projects
    await inv.page.goto(base + "/admin/projects", { waitUntil: "load" });
    const body = (await inv.page.textContent("body")) ?? "";
    ok("unassigned team member sees no projects", !/PF-00(41|38|44)/.test(body));
    await inv.ctx.close();
  }
  await admin.ctx.close();
}

// 3. Files: upload as client, download as owner, 404 for other client, 401 anonymous, reject .exe
let northbankProject = null;
{
  const maya = await fresh("maya@northbank.test");
  await maya.page.goto(base + "/portal/projects", { waitUntil: "load" });
  northbankProject = (await maya.page.$$eval("a[href^='/portal/projects/']", (as) => as.map((a) => a.getAttribute("href"))))[0]?.split("/")[3] ?? null;
  await maya.page.goto(base + `/portal/projects/${northbankProject}/files`, { waitUntil: "load" });
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
  await maya.page.locator('input[aria-label="Choose files"]:enabled').waitFor({ state: "attached" });
  const filename = `qa-shot-${Date.now()}.png`;
  await maya.page.getByLabel("Choose files").setInputFiles({ name: filename, mimeType: "image/png", buffer: png });
  await maya.page.getByRole("button", { name: /^Upload/ }).click();
  const uploadedLink = maya.page.getByRole("link", { name: filename, exact: true });
  await uploadedLink.waitFor({ state: "visible", timeout: 60000 });
  const mine = await uploadedLink.getAttribute("href");
  ok("client upload appears in file list", !!mine && (await maya.page.textContent("body"))?.includes("qa-shot-"));
  await shot(maya.page, "files-uploaded");
  if (mine) {
    const r1 = await maya.ctx.request.get(base + mine);
    ok("owner downloads file", r1.status() === 200 && (r1.headers()["content-type"] ?? "").includes("image/png"), `${r1.status()} ${r1.headers()["content-type"]}`);
    const daniel = await fresh("daniel@meridian.test");
    const r2 = await daniel.ctx.request.get(base + mine);
    ok("other client's download is 404", r2.status() === 404, String(r2.status()));
    await daniel.ctx.close();
    const anon = await browser.newContext();
    const r3 = await anon.request.get(base + mine, { maxRedirects: 0 });
    ok("anonymous download refused", [401, 302, 307].includes(r3.status()), String(r3.status()));
    await anon.close();
  }
  expectedErrors.set(maya.page, [{ status: 422, path: "/api/upload/chunks" }]);
  await maya.page.getByLabel("Choose files").setInputFiles({ name: "payload.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ....") });
  const rejectedEarly = !((await maya.page.textContent("body"))?.includes("payload.exe"));
  if (!rejectedEarly) {
    await maya.page.getByRole("button", { name: /^Upload/ }).click();
    await maya.page.getByRole("alert").filter({ hasText: /not accepted|not allowed|rejected/i }).waitFor({ timeout: 60000 });
  }
  const bodyText = (await maya.page.textContent("body")) ?? "";
  ok("executable rejected", rejectedEarly || /not accepted|not allowed|rejected/i.test(bodyText), rejectedEarly ? "filtered client-side" : bodyText.match(/[^.]*not accepted[^.]*/i)?.[0] ?? "");
  await maya.ctx.close();
}

// 4. Approvals: PM requests, client decides, audit visible
{
  const pm = await fresh("pm@pixelforge.test");
  await pm.page.goto(base + `/admin/projects/${northbankProject}/approvals`, { waitUntil: "load" });
  await pm.page.getByRole("button", { name: "Request approval" }).click();
  const title = `Homepage hero v3 (${Date.now()})`;
  await pm.page.getByLabel("Title").fill(title);
  await pm.page.getByLabel("What should the client review?").fill("Please review the revised hero and confirm the headline.");
  await pm.page.getByRole("button", { name: "Send for approval" }).click();
  await pm.page.locator("li").filter({ hasText: title }).first().waitFor({ state: "visible", timeout: 30000 });
  ok("approval created", (await pm.page.textContent("body"))?.includes(title));
  const maya = await fresh("maya@northbank.test");
  await maya.page.goto(base + "/portal/approvals", { waitUntil: "load" });
  ok("client sees pending approval", (await maya.page.textContent("body"))?.includes(title));
  const card = maya.page.locator("li").filter({ hasText: title }).first();
  await card.getByRole("button", { name: "Approve" }).first().click();
  await maya.page.getByLabel(/Comment/).fill("Looks great. Go ahead.");
  await maya.page.getByRole("button", { name: "Approve" }).last().click();
  await card.getByRole("button", { name: "Approve", exact: true }).waitFor({ state: "hidden", timeout: 30000 });
  await shot(maya.page, "approval-decided");
  const decided = (await maya.page.textContent("body")) ?? "";
  ok("approval shows as approved for the client", /Approved/.test(decided) && !(await card.getByRole("button", { name: "Approve" }).count()));
  await pm.page.waitForTimeout(1500);
  await pm.page.reload({ waitUntil: "load" });
  ok("PM sees approval decision", /Approved/.test((await pm.page.locator("li").filter({ hasText: title }).first().textContent()) ?? ""));
  await pm.page.goto(base + `/admin/projects/${northbankProject}/activity`, { waitUntil: "load" });
  ok("decision in activity log", /approv/i.test((await pm.page.textContent("body")) ?? ""));
  await maya.ctx.close();
  await pm.ctx.close();
}

// 5. Kanban drag and drop persists
{
  const pm = await fresh("pm@pixelforge.test");
  await pm.page.goto(base + "/admin/tasks", { waitUntil: "load" });
  const todo = pm.page.getByRole("region", { name: "To do" });
  const inProgress = pm.page.getByRole("region", { name: "In progress" });
  const card = todo.locator('li[draggable="true"]').first();
  const href = await card.getByRole("link").getAttribute("href");
  const beforeCount = await inProgress.locator("li[draggable]").count();
  const saved = pm.page.waitForResponse(r => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]), { timeout: 30000 });
  await card.dragTo(inProgress);
  const response = await saved;
  await response.finished();
  ok("kanban save completes successfully", response.ok() && await pm.page.getByRole("alert").count() === 0);
  await pm.page.reload({ waitUntil: "load" });
  const after = await pm.page.getByRole("region", { name: "In progress" }).locator("li[draggable]").count();
  const moved = href ? await pm.page.getByRole("region", { name: "In progress" }).locator(`a[href='${href}']`).count() === 1 : false;
  ok("kanban drag persists after reload", moved && after === beforeCount + 1, `${beforeCount} → ${after}`);
  await shot(pm.page, "kanban-after-drag");
  await pm.ctx.close();
}

await browser.close();
console.log(`\n${results.filter((r) => r[1]).length}/${results.length} passed`);
if (errors.length) { console.log("ERRORS:"); for (const e of errors) console.log(e); }
process.exit(results.every((r) => r[1]) && errors.length === 0 ? 0 : 1);
