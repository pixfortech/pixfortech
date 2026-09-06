// Interaction QA: mobile menu, services accordion, enquiry flow, keyboard focus, reduced motion.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = "/tmp/claude-0/-home-user-pixfortech/b9fe4a5d-cca4-5894-8a93-ccba0580142b/scratchpad/shots/interact";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const log = (...a) => console.log(...a);
const errors = [];

// 1. Mobile menu at 320px
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log("320 overflowX:", overflow);
  await page.screenshot({ path: `${out}/home-320.png` });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/menu-320.png` });
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  log("menu first focus:", focused);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  log("menu closed via Escape:", await page.getByRole("dialog").count() === 0);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Services" }).click();
  await page.waitForURL("**/services");
  await page.waitForTimeout(600);
  log("menu nav to /services ok; dialog closed:", await page.getByRole("dialog").count() === 0);
  await ctx.close();
}

// 2. Services accordion + keyboard focus ring on desktop
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  const btn = page.getByRole("button", { name: "Shopify Development" });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(600);
  log("accordion expanded:", await btn.getAttribute("aria-expanded"));
  await page.screenshot({ path: `${out}/accordion.png` });
  // keyboard focus
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.screenshot({ path: `${out}/focus.png` });
  await ctx.close();
}

// 3. Enquiry flow
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(base + "/contact?type=ecommerce", { waitUntil: "networkidle" });
  log("prefilled step heading:", await page.getByRole("heading", { level: 2 }).first().textContent());
  // validation error
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);
  log("validation alerts:", await page.getByRole("alert").count());
  await page.screenshot({ path: `${out}/form-errors.png` });
  await page.getByLabel("Project summary").fill("We run a Shopify store selling ceramics. The theme is slow and the merchant cannot edit pages.");
  await page.getByText("$5k – $15k").click();
  await page.getByText("1 – 2 months").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(400);
  await page.getByLabel("Your name").fill("Test Person");
  await page.getByLabel("Email").fill("test@example.com");
  await page.screenshot({ path: `${out}/form-step3.png` });
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await page.waitForTimeout(1500);
  const success = await page.getByRole("status").textContent();
  log("success:", success?.slice(0, 80));
  await page.screenshot({ path: `${out}/form-success.png` });
  await ctx.close();
}

// 4. Reduced motion home render
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/home-reduced.png` });
  await ctx.close();
}

// 5. API validation
{
  const ctx = await browser.newContext();
  const bad = await ctx.request.post(base + "/api/enquiry", { multipart: { type: "website", summary: "short", budget: "x", timeline: "asap", name: "A", email: "nope" } });
  log("api 422:", bad.status(), JSON.stringify(await bad.json()).slice(0, 160));
  const hp = await ctx.request.post(base + "/api/enquiry", { multipart: { type: "website", summary: "This is a long enough summary for the form.", budget: "unsure", timeline: "flexible", name: "Bot", email: "bot@example.com", website: "spam" } });
  log("api honeypot:", hp.status(), await hp.text());
  await ctx.close();
}

await browser.close();
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
