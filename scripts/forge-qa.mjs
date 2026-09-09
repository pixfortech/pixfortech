// Scroll-forge QA: progress follows scroll, freezes on stop, reverses on scroll-up.
import { launchBrowser, qaOutput } from "./qa-runtime.mjs";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = qaOutput("forge");
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const errors = [];
const W = Number(process.env.W ?? 1440);
const ctx = await browser.newContext({ viewport: { width: W, height: W < 800 ? 812 : 900 }, hasTouch: W < 800 });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto(base + "/services", { waitUntil: "networkidle" });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
await page.waitForTimeout(600);
const sample = () => page.evaluate(() => {
  const els = [...document.querySelectorAll("[data-forge]")];
  const active = els.filter((e) => e.dataset.forge === "active").map((e) => Number(e.style.getPropertyValue("--forge")).toFixed(2));
  return { total: els.length, forged: els.filter((e) => e.dataset.forge === "forged").length, unforged: els.filter((e) => e.dataset.forge === "unforged").length, active };
});
console.log("at top:", JSON.stringify(await sample()));
// find first unforged element and scroll so its top sits mid-band
const target = await page.evaluate(() => { const e = [...document.querySelectorAll('[data-forge="unforged"]')][0]; return e ? e.getBoundingClientRect().top + window.scrollY : null; });
const vh = await page.evaluate(() => window.innerHeight);
const band = Math.min(vh * 0.42, 420);
const y = target - (vh - band * 0.5);
await page.evaluate((yy) => window.scrollTo(0, yy), y);
await page.waitForTimeout(150);
const s1 = await sample(); console.log("mid-band:", JSON.stringify(s1));
await page.screenshot({ path: `${out}/mid-${W}.png` });
await page.waitForTimeout(1500);
const s2 = await sample(); console.log("after 1.5s idle (must be identical):", JSON.stringify(s2), "frozen:", JSON.stringify(s1.active) === JSON.stringify(s2.active));
await page.evaluate((yy) => window.scrollTo(0, yy + 60), y);
await page.waitForTimeout(120);
const s3 = await sample(); console.log("+60px:", JSON.stringify(s3.active));
await page.evaluate((yy) => window.scrollTo(0, yy), y);
await page.waitForTimeout(120);
const s4 = await sample(); console.log("back to mid (should equal mid):", JSON.stringify(s4.active), "reversible:", JSON.stringify(s4.active) === JSON.stringify(s1.active));
// overlay pixel count at the front: small
const drawn = await page.evaluate(() => { const c = document.querySelector(".pixel-fg"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; });
console.log("overlay painted px:", drawn, "of", await page.evaluate(() => { const c = document.querySelector(".pixel-fg"); return c.width * c.height; }));
// idle: no RAF for forge, field calm -> sample fps of forge updates is not needed; check that no --forge changes over 1s
await page.evaluate((yy) => window.scrollTo(0, yy + 30), y);
await page.waitForTimeout(100);
const a = await sample(); await page.waitForTimeout(1000); const b = await sample();
console.log("idle stability:", JSON.stringify(a.active) === JSON.stringify(b.active));
// full scroll then back to top: everything above is forged and stays; bottom band unforges when scrolling up
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(200);
console.log("bottom:", JSON.stringify(await sample()));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
console.log("top again:", JSON.stringify(await sample()));
await ctx.close(); await browser.close();
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
