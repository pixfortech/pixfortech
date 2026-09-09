// Behaviour QA: scroll-loop egg, dwell egg + game, form quietness, 404, reduced motion, mobile.
import { launchBrowser, qaOutput } from "./qa-runtime.mjs";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = qaOutput("behaviour");
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const errors = [];
const mk = async (opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts }); const page = await ctx.newPage(); page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); }); page.on("pageerror", (e) => errors.push("pageerror: " + e.message)); return { ctx, page }; };
const bubble = (page) => page.getByTestId("mascot-bubble");

// 1. Scroll oscillation
{
  const { ctx, page } = await mk();
  await page.goto(base + "/services", { waitUntil: "networkidle" });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  await page.mouse.move(400, 400);
  for (let i = 0; i < 9; i++) { await page.evaluate((y) => window.scrollTo(0, y), i % 2 ? 1400 : 300); await page.waitForTimeout(450); }
  await page.waitForTimeout(400);
  const b = await bubble(page).count();
  console.log("scroll-loop bubble:", b ? await bubble(page).textContent() : "(none)", "| mascot class:", await page.getByTestId("mascot").getAttribute("class"));
  await page.screenshot({ path: `${out}/dizzy.png` });
  // repeat: should NOT fire again within cooldown
  await page.waitForTimeout(6500);
  for (let i = 0; i < 9; i++) { await page.evaluate((y) => window.scrollTo(0, y), i % 2 ? 1400 : 300); await page.waitForTimeout(450); }
  await page.waitForTimeout(400);
  console.log("scroll-loop again within cooldown:", (await bubble(page).count()) ? await bubble(page).textContent() : "(none)");
  await ctx.close();
}
// 2. Form quietness: mascot hides when typing; celebrates on success (dev transport logs)
{
  const { ctx, page } = await mk();
  await page.goto(base + "/contact?type=website", { waitUntil: "networkidle" });
  await page.getByLabel("Project summary").click();
  await page.waitForTimeout(600);
  console.log("mascot hidden while typing:", (await page.getByTestId("mascot").getAttribute("class"))?.includes("pip--hidden"));
  await page.getByLabel("Project summary").fill("We run a Shopify store selling ceramics. The theme is slow and we cannot edit pages.");
  await page.getByText("$5k – $15k").click(); await page.getByText("1 – 2 months").click();
  await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(400);
  await page.getByLabel("Your name").fill("Test Person"); await page.getByLabel("Email").fill("test@example.com");
  await page.getByRole("button", { name: "Send it over" }).click();
  await page.waitForTimeout(1500);
  console.log("form success:", (await page.getByRole("status").count()) > 0, "| bubble:", (await bubble(page).count()) ? await bubble(page).textContent() : "(none)");
  await page.screenshot({ path: `${out}/form-success.png` });
  await ctx.close();
}
// 3. 404 with inline game: win it by driving the attractor over targets
{
  const { ctx, page } = await mk();
  await page.goto(base + "/this-does-not-exist", { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/404.png` });
  console.log("404 bubble:", (await bubble(page).count()) ? await bubble(page).textContent() : "(none)", "| class:", await page.getByTestId("mascot").getAttribute("class"));
  const c = page.locator("canvas.pf-game__canvas");
  const b = await c.boundingBox();
  // sweep the pointer around the board in a spiral to gather pixels
  for (let k = 0; k < 900; k++) { const a = k / 18; const r = 20 + (k / 900) * (b.width / 2 - 20); await page.mouse.move(b.x + b.width / 2 + Math.cos(a) * r, b.y + b.height / 2 + Math.sin(a) * r * 1); if (k % 30 === 0) await page.waitForTimeout(16); }
  for (let k = 0; k < 600; k++) { const a = k / 14; const r = 10 + ((k % 200) / 200) * (b.width / 2.2); await page.mouse.move(b.x + b.width / 2 + Math.cos(a) * r, b.y + b.height / 2 + Math.sin(a) * r); if (k % 30 === 0) await page.waitForTimeout(16); }
  await page.waitForTimeout(500);
  console.log("404 game progress:", await page.locator(".pf-game__foot").textContent());
  await page.screenshot({ path: `${out}/404-after.png` });
  await ctx.close();
}
// 4. Reduced motion
{
  const { ctx, page } = await mk({ reducedMotion: "reduce" });
  await page.goto(base + "/about", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tier = await page.evaluate(() => window.__pixelEngine?.tier);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 1200); });
  await page.waitForTimeout(700);
  const states = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].map((e) => e.getAttribute("data-reveal")).reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {}));
  console.log("reduced motion tier:", tier, "states:", JSON.stringify(states));
  await page.screenshot({ path: `${out}/reduced-about.png` });
  await ctx.close();
}
// 5. Mobile: menu open hides mascot; tap ripple; no overflow; counter pill hidden
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log("mobile tier:", await page.evaluate(() => window.__pixelEngine?.tier), "overflow:", await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "pill visible:", await page.getByTestId("pixel-counter").isVisible().catch(() => false));
  await page.screenshot({ path: `${out}/mobile-home.png` });
  await page.getByRole("button", { name: "Open menu" }).click(); await page.waitForTimeout(400);
  console.log("mobile menu open, mascot hidden:", (await page.getByTestId("mascot").getAttribute("class"))?.includes("pip--hidden"));
  await page.screenshot({ path: `${out}/mobile-menu.png` });
  await page.keyboard.press("Escape");
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 1800); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/mobile-scrolled.png` });
  await ctx.close();
}
await browser.close();
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
