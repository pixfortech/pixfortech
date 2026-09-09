import assert from "node:assert/strict";
import { launchBrowser, qaOutput } from "./qa-runtime.mjs";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await launchBrowser();
const out = qaOutput("public-production");
const errors = [];
try {
  const context = await browser.newContext();
  const sitemap = await context.request.get(`${base}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  const paths = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  assert.ok(paths.length >= 11, "Sitemap must contain the public website routes");
  for (const path of paths) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 200, `Public route ${path}`);
    assert.match(await response.text(), /<h1[\s>]/, `Public route ${path} must render its heading`);
  }
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", e => errors.push(e.message));
  const missing = await page.goto(`${base}/production-qa-missing-page`);
  assert.equal(missing.status(), 404);
  await page.locator("canvas.pf-game__canvas").waitFor();
  await page.screenshot({ path: `${out}/404.png` });
  console.log(`PASS: ${paths.length} public routes, sitemap and interactive 404`);
  const reduced = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 375, height: 812 } });
  const mobile = await reduced.newPage();
  mobile.setDefaultTimeout(30000);
  mobile.on("pageerror", e => errors.push(e.message));
  await mobile.goto(`${base}/about`);
  await mobile.locator('[data-testid="mascot"].pip--static').waitFor();
  assert.ok(await mobile.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches));
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await mobile.getByRole("heading", { level: 1 }).waitFor();
  await mobile.screenshot({ path: `${out}/mobile-reduced-motion.png`, fullPage: true });
  await mobile.getByRole("button", { name: "Open menu", exact: true }).click();
  await mobile.locator('[data-testid="mascot"].pip--hidden').waitFor();
  await mobile.keyboard.press("Escape");
  console.log("PASS: reduced-motion static mascot, mobile menu and no horizontal overflow");
  assert.deepEqual(errors, [], "Public browser exceptions");
} finally {
  await browser.close();
}
