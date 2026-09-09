// Pixel system QA: field, reversible reveals, transitions, fps, console.
import { launchBrowser, qaOutput } from "./qa-runtime.mjs";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = qaOutput("pixel");
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const errors = [];
const width = Number(process.env.W ?? 1440), height = width < 800 ? 812 : 900;
const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: process.env.RM ? "reduce" : "no-preference", hasTouch: width < 800 });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
await page.waitForTimeout(1500);
await page.mouse.move(700, 400); await page.mouse.move(900, 500, { steps: 10 });
await page.screenshot({ path: `${out}/home-hero-${width}.png` });
// fps sample
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(Math.round(n / 2)); }; requestAnimationFrame(tick); }));
console.log(`[${width}] fps≈${fps}`);
// scroll to selected work, capture assembling then revealed
const y1 = await page.evaluate(() => document.getElementById("work-title")?.getBoundingClientRect().top + window.scrollY - 200);
await page.evaluate((y) => window.scrollTo(0, y), y1);
await page.waitForTimeout(220);
await page.screenshot({ path: `${out}/home-work-assembling-${width}.png` });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/home-work-revealed-${width}.png` });
const states1 = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].map((e) => e.getAttribute("data-reveal")).reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {}));
console.log(`[${width}] states after scroll down:`, JSON.stringify(states1));
// deep scroll then back to top: work section should deconstruct then re-assemble
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.6));
await page.waitForTimeout(900);
const states2 = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].map((e) => e.getAttribute("data-reveal")).reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {}));
console.log(`[${width}] states deep:`, JSON.stringify(states2));
await page.evaluate((y) => window.scrollTo(0, y), y1);
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/home-work-reassembling-${width}.png` });
await page.waitForTimeout(1200);
const workState = await page.evaluate(() => document.getElementById("work-title")?.closest("[data-reveal]")?.getAttribute("data-reveal"));
console.log(`[${width}] work heading after return:`, workState);
// transition: click Work nav link
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
const link = width < 800 ? null : page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Work" });
if (link) {
  await link.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/transition-out-${width}.png` });
  await page.waitForURL("**/work");
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/transition-in-${width}.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/work-${width}.png` });
  // hover first project card -> theme preview
  await page.locator("article").first().hover();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/work-hover-${width}.png` });
  console.log(`[${width}] url now`, page.url());
}
await ctx.close();
await browser.close();
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
