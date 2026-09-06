// Visual QA helper: screenshots routes at multiple viewports using the
// pre-installed Chromium. Usage: node scripts/shoot.mjs [baseUrl] [routes...]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const routes = process.argv.slice(3).length ? process.argv.slice(3) : ["/"];
const widths = (process.env.WIDTHS ?? "375,1440").split(",").map(Number);
const out = process.env.OUT ?? "/tmp/claude-0/-home-user-pixfortech/b9fe4a5d-cca4-5894-8a93-ccba0580142b/scratchpad/shots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const errors = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 812 : 900 }, deviceScaleFactor: 1, reducedMotion: process.env.RM ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${w}] console: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${w}] pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`[${w}] HTTP ${r.status()} ${r.url()}`); });
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(process.env.WAIT ? Number(process.env.WAIT) : 1200);
    // scroll through to trigger reveals
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const name = (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_")) + `-${w}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: !process.env.VIEWPORT });
    console.log(`${name}: height=${h} overflowX=${overflow}`);
    if (overflow > 0) errors.push(`[${w}] horizontal overflow ${overflow}px on ${r}`);
  }
  await ctx.close();
}
await browser.close();
if (errors.length) { console.log("ISSUES:\n" + errors.join("\n")); }
