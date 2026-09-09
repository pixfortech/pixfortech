import { launchBrowser, qaOutput } from "./qa-runtime.mjs";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = qaOutput("mascot");
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto(base + "/about", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
// grab mascot region for each state by forcing store state via the exposed store? Not exposed; use class swap on the DOM for sprites via React state: poke button instead.
const m = page.getByTestId("mascot");
const clip = async (name) => { const b = await m.boundingBox(); await page.screenshot({ path: `${out}/${name}.png`, clip: { x: b.x - 260, y: b.y - 120, width: b.width + 280, height: b.height + 140 } }); };
await clip("idle");
await page.mouse.move(1000, 600); await page.waitForTimeout(300); await clip("curious-look");
await m.getByRole("button", { name: /Pip, the Pixel Forge mascot/ }).click({ force: true }); await page.waitForTimeout(400); await clip("poked-celebrating");
await page.waitForTimeout(6500); await clip("greeting-or-idle");
// counter pill
const pill = page.getByTestId("pixel-counter");
console.log("counter pill:", await pill.textContent(), "|", await pill.getAttribute("title"));
await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, document.documentElement.scrollHeight); });
await page.waitForTimeout(1500);
console.log("counter after full scroll:", await pill.textContent(), "complete=", await pill.getAttribute("data-complete"));
console.log("footer line:", (await page.getByTestId("pixel-counter-line").textContent())?.slice(0, 120));
const bubble = page.getByTestId("mascot-bubble");
console.log("bubble after page complete:", await bubble.count() ? await bubble.textContent() : "(none)");
await clip("page-complete");
// Full page bottom shot for footer/counter
await page.screenshot({ path: `${out}/footer-viewport.png` });
await browser.close();
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
