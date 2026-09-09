import assert from "node:assert/strict";
import { launchBrowser, qaPassword, qaOutput } from "./qa-runtime.mjs";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await launchBrowser();
const errors = [];
const pages = [];
const out = qaOutput("workspace");
async function login(email, area) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  pages.push(page);
  page.setDefaultTimeout(30000);
  page.on("pageerror", e => errors.push(`${new URL(page.url()).pathname}: ${e.message}`));
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(qaPassword());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(new RegExp(`/${area}`), { timeout: 30000 });
  return { ctx, page };
}
try {
  const admin = await login("admin@pixelforge.test", "admin");
  const client = await login("maya@northbank.test", "portal");
  const p = admin.page;
  const c = client.page;
  if (!process.env.QA_MOBILE_ONLY) {
  const marker = `Production QA ${Date.now()}`;
  await p.goto(`${base}/admin/projects`);
  await p.getByRole("link", { name: "New project", exact: true }).click();
  await p.getByLabel("Title", { exact: true }).fill(marker);
  await p.getByLabel(/^Summary/).fill("Isolated deployment QA project");
  await p.getByRole("button", { name: "Create project", exact: true }).click();
  await p.waitForURL(/\/admin\/projects\/[a-f0-9-]+$/, { timeout: 30000 });
  await p.reload();
  await p.getByRole("heading", { name: marker, exact: true }).waitFor();
  console.log("PASS: project creation persists");
  await p.goto(`${base}/admin/tasks`);
  await p.getByRole("link", { name: "New task", exact: true }).click();
  await p.getByLabel("Title", { exact: true }).fill(marker + " task");
  const option = p.getByLabel("Project", { exact: true }).locator("option").filter({ hasText: marker });
  await p.getByLabel("Project", { exact: true }).selectOption(await option.getAttribute("value"));
  await p.getByRole("button", { name: "Create task", exact: true }).click();
  await p.waitForURL(/\/admin\/tasks\/[a-f0-9-]+$/, { timeout: 30000 });
  await p.reload();
  await p.getByRole("heading", { name: marker + " task", exact: true }).waitFor();
  console.log("PASS: task creation persists");
  await p.getByRole("button", { name: "Search projects, requests, tasks. Ctrl or Command K", exact: true }).click();
  await p.getByRole("textbox", { name: "Search", exact: true }).fill(marker);
  await p.getByRole("option").filter({ hasText: marker + " task" }).waitFor();
  await p.keyboard.press("Escape");
  const foreign = await client.ctx.request.get(`${base}/api/search?q=${encodeURIComponent(marker)}`);
  assert.equal(foreign.status(), 200);
  const results = await foreign.json();
  assert.equal(results.tasks.length, 0, "Internal task must be absent from client search");
  console.log("PASS: global search finds authorized records and excludes internal tasks");
  await c.goto(`${base}/portal/profile`);
  const originalTitle = await c.getByLabel(/^Job title/).inputValue();
  await c.getByLabel(/^Job title/).fill(marker);
  await c.getByRole("button", { name: "Save profile", exact: true }).click();
  await c.getByRole("status").filter({ hasText: "Profile saved" }).waitFor();
  await c.reload();
  assert.equal(await c.getByLabel(/^Job title/).inputValue(), marker);
  await c.getByLabel(/^Job title/).fill(originalTitle);
  await c.getByRole("button", { name: "Save profile", exact: true }).click();
  await c.getByRole("status").filter({ hasText: "Profile saved" }).waitFor();
  await c.goto(`${base}/portal/settings`);
  const preference = c.getByRole("checkbox", { name: "Messages inApp", exact: true });
  const before = await preference.isChecked();
  await preference.setChecked(!before);
  await c.getByRole("button", { name: "Save preferences", exact: true }).click();
  await c.getByRole("status").filter({ hasText: "Preferences saved" }).waitFor();
  await c.reload();
  assert.equal(await preference.isChecked(), !before);
  await preference.setChecked(before);
  await c.getByRole("button", { name: "Save preferences", exact: true }).click();
  await c.getByRole("status").filter({ hasText: "Preferences saved" }).waitFor();
  console.log("PASS: profile and notification preferences persist and are restored");
  }
  for (const [page, area] of [[p, "admin"], [c, "portal"]]) {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["", "/projects", "/requests", "/settings", "/profile"]) {
      const response = await page.goto(`${base}/${area}${path}`);
      assert.equal(response.status(), 200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${area}${path} has ${overflow}px page overflow`);
      await page.screenshot({ path: `${out}/${area}${path.replaceAll("/", "-") || "-home"}.png`, caret: "initial" });
    }
  }
  console.log("PASS: admin and client mobile layouts have no horizontal page overflow");
  assert.deepEqual(errors, [], "Unexpected browser exceptions");
} catch (error) {
  for (const [i, page] of pages.entries()) {
    console.log("Failure page", i, new URL(page.url()).pathname, await page.title());
    await page.screenshot({ path: `${out}/failure-${i}.png`, caret: "initial" });
  }
  throw error;
} finally {
  await browser.close();
}
