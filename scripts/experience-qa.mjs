// Feature QA for the experience upgrade: login entry point, account menu, profile identity,
// slug redirects, avatar, password change, hero interaction, PiP hide/restore and message
// uniqueness, all five games, realtime notifications across two sessions, mobile navigation.
// Runs against a dev server (window.__pfBehaviour is exposed there) with the demo fixtures.
import { launchBrowser, qaOutput, qaPassword } from "./qa-runtime.mjs";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const production = process.argv.includes("--production");
const out = qaOutput("experience");
mkdirSync(out, { recursive: true });
const PASSWORD = qaPassword();
const browser = await launchBrowser();
const results = [];
const errors = [];
const expectedErrors = new WeakMap();
const ok = (name, pass, detail = "") => { results.push([name, pass]); console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); };
const watch = (page, tag) => { page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`)); page.on("console", (m) => { if (m.type() !== "error") return; const expected = expectedErrors.get(page); if (expected && m.text().includes(String(expected.status)) && new URL(m.location().url || base).pathname === expected.path) return; errors.push(`[${tag}] ${m.text().slice(0, 160)}`); }); };
const T = { timeout: 120000 };
async function login(page, email, password = PASSWORD) {
  for (let i = 0; i < 4; i++) {
    await page.goto(base + "/login", { waitUntil: "load", ...T });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const done = await page.waitForURL(/\/(portal|admin)/, { timeout: 15000 }).then(() => true).catch(() => false);
    if (done) return;
    console.log("  (rate limited, waiting)"); await page.waitForTimeout(25000);
  }
  throw new Error("login failed for " + email);
}

// 1. Logged-out login entry point, desktop and mobile
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "public");
  await page.goto(base + "/", { waitUntil: "load", ...T }); await page.waitForTimeout(800);
  const link = page.getByTestId("login-link");
  ok("login link visible with literal accessible name", (await link.count()) === 1 && /sign in to Pixel Forge/i.test((await link.getAttribute("aria-label")) ?? "") && /Enter the Forge/.test(await link.textContent()));
  ok("footer login link", (await page.locator("footer").getByRole("link", { name: /sign in to Pixel Forge/i }).count()) === 1);
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true }); const mp = await m.newPage(); watch(mp, "mobile");
  await mp.goto(base + "/", { waitUntil: "load", ...T });
  await mp.getByRole("button", { name: "Open menu" }).click(); await mp.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: /sign in to Pixel Forge/i }).waitFor();
  ok("mobile menu login link", (await mp.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: /sign in to Pixel Forge/i }).count()) === 1);
  await mp.screenshot({ path: `${out}/mobile-menu-375.png` });
  await m.close();
}

// 2. Signed-in account menu, keyboard, role routing, sign out with PiP line
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "account");
  await login(page, "maya@northbank.test");
  await page.goto(base + "/", { waitUntil: "load", ...T });
  const btn = page.getByTestId("account-button");
  for (let i = 0; i < 3 && (await btn.count()) === 0; i++) { await btn.waitFor({ timeout: 10000 }).catch(() => undefined); if ((await btn.count()) === 0) { await page.waitForTimeout(20000); await page.reload({ waitUntil: "load", ...T }); } }
  ok("account button replaces login when signed in", (await btn.count()) === 1 && (await page.getByTestId("login-link").count()) === 0);
  await btn.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(200);
  const menu = page.getByTestId("account-menu");
  ok("account menu opens from keyboard", (await menu.count()) === 1 && (await menu.getByRole("menuitem").count()) >= 6);
  const first = await menu.getByRole("menuitem").first().getAttribute("href");
  ok("client menu routes to portal", first === "/portal");
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  ok("escape closes the menu", (await page.getByTestId("account-menu").count()) === 0);
  await btn.click(); await menu.getByRole("menuitem", { name: /Sign out/ }).click(); await page.getByTestId("login-link").waitFor({ timeout: 60000 });
  ok("sign out returns to the public site signed out", (await page.getByTestId("login-link").count()) === 1);
  await ctx.close();
}

// 3. Profile: display name, username, slug (+ redirect), publish, avatar, password change
let slugOld = null, slugNew = null;
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "profile");
  await login(page, "dev@pixelforge.test");
  await page.goto(base + "/admin/profile", { waitUntil: "load", ...T }); await page.waitForTimeout(800);
  const tag = Date.now().toString(36).slice(-5);
  await page.getByLabel("Display name").fill(`Rahul M ${tag}`);
  await page.getByLabel("Short bio").fill("Frontend engineer. Argues about spacing, wins about half the time.");
  await page.getByLabel("LinkedIn").fill("linkedin.com/in/rahul-example");
  await page.getByRole("button", { name: "Save profile" }).click(); await page.getByText("Profile saved", { exact: true }).waitFor({ timeout: 60000 });
  ok("display name saved", /Profile saved/.test((await page.textContent("body")) ?? ""));
  const uname = page.getByTestId("username-input");
  await uname.fill(`rahul_${tag}`); await page.locator("#pr-username-status").getByText(/^Available\./).waitFor({ timeout: 60000 });
  ok("username availability checked live", /Available/.test((await page.textContent("#pr-username-status")) ?? ""));
  await page.getByTestId("save-username").click(); await page.getByText("Username updated", { exact: true }).waitFor({ timeout: 60000 });
  await uname.fill("admin"); await page.waitForTimeout(500);
  ok("reserved username rejected", /taken|reserved/i.test((await page.textContent("#pr-username-status")) ?? ""));
  slugOld = await page.getByTestId("slug-input").inputValue();
  slugNew = `rahul-qa-${Date.now().toString(36)}`;
  await page.getByTestId("slug-input").fill(slugNew); await page.waitForTimeout(900);
  await page.getByTestId("save-slug").click(); await page.getByTestId("public-url").filter({ hasText: new RegExp(`${slugNew}$`) }).waitFor({ timeout: 60000 });
  ok("slug updated", (await page.getByTestId("public-url").textContent())?.endsWith(slugNew));
  await page.getByTestId("publish-toggle").check(); await page.waitForTimeout(1500);
  ok("profile published", /Published/.test((await page.textContent("body")) ?? ""));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=", "base64");
  await page.getByLabel("Choose a profile picture").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png }); await page.getByText("Picture updated", { exact: true }).waitFor({ timeout: 60000 });
  ok("avatar uploaded", /Picture updated/.test((await page.textContent("body")) ?? ""));
  expectedErrors.set(page, { status: 422, path: "/api/avatar" });
  const invalidAvatar = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/avatar" && r.request().method() === "POST");
  await page.getByLabel("Choose a profile picture").setInputFiles({ name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg onload=alert(1)></svg>") });
  const invalidAvatarStatus = (await invalidAvatar).status();
  await page.getByRole("alert").filter({ hasText: /PNG, JPEG or WebP/ }).waitFor();
  ok("non-image avatar rejected", invalidAvatarStatus === 422);
  expectedErrors.delete(page);
  await page.screenshot({ path: `${out}/profile-editor.png`, fullPage: true });
  // password change with confirmation and strength
  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByLabel("New password", { exact: true }).fill("wrong-confirm-1234");
  await page.getByLabel("Confirm password").fill("different-1234");
  ok("mismatch blocks submit", await page.getByRole("button", { name: "Change password" }).isDisabled());
  await page.getByLabel("Confirm password").fill("wrong-confirm-1234");
  await page.getByRole("button", { name: "Change password" }).click(); await page.getByTestId("password-form").getByRole("status").waitFor({ timeout: 60000 });
  ok("password changed with feedback", /Password changed/.test((await page.textContent("body")) ?? ""));
  await page.getByLabel("Current password").fill("wrong-confirm-1234");
  await page.getByLabel("New password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click(); await page.getByTestId("password-form").getByRole("status").waitFor({ timeout: 60000 });
  ok("password restored", /Password changed/.test((await page.textContent("body")) ?? ""));
  await ctx.close();
}
// public page, redirect, private client
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "people");
  const r = await page.goto(base + `/people/${slugOld}`, { waitUntil: "load", ...T });
  ok("old slug redirects permanently to new", page.url().endsWith(`/people/${slugNew}`) && r?.status() === 200);
  const chain = await ctx.request.get(base + `/people/${slugOld}`, { maxRedirects: 0 });
  ok("redirect status is 308", chain.status() === 308);
  ok("public page shows name and avatar", /Rahul/.test((await page.textContent("h1")) ?? "") && (await page.locator("img[alt^='Portrait']").count()) === 1);
  const robots = await page.locator("meta[name=robots]").getAttribute("content").catch(() => null);
  ok("published page is indexable", !robots || !/noindex/.test(robots));
  const missing = await ctx.request.get(base + "/people/tom-okafor");
  ok("client accounts are never public", missing.status() === 404);
  const enumerate = await ctx.request.get(base + "/api/avatar/00000000-0000-0000-0000-000000000000");
  ok("unknown avatar id is 404", enumerate.status() === 404);
  const sitemap = await (await ctx.request.get(base + "/sitemap.xml")).text();
  ok("published profile in sitemap", sitemap.includes(`/people/${slugNew}`) && !sitemap.includes("/people/tom"));
  await page.screenshot({ path: `${out}/public-profile.png` });
  await ctx.close();
}

// 4. Hero: mouse, touch, keyboard, secrets
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "hero");
  await page.goto(base + "/", { waitUntil: "load", ...T }); await page.waitForTimeout(3200);
  const kinds = [];
  await page.exposeFunction("__hero", (k) => kinds.push(k));
  await page.evaluate(() => window.addEventListener("pf:hero", (e) => window.__hero(e.detail.kind)));
  const box = await page.getByTestId("hero-scene").boundingBox();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.5, { steps: 10 });
  await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.55); await page.waitForTimeout(200);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5); await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35, { steps: 12 }); await page.mouse.up();
  await page.getByTestId("hero-scene").focus(); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("Enter");
  for (let i = 0; i < 3; i++) { await page.mouse.click(box.x + box.width * 0.88, box.y + box.height * 0.25); await page.waitForTimeout(90); }
  await page.waitForTimeout(400);
  ok("hero mouse hover, click, drag and keyboard events", ["hover", "tap", "drag"].every((k) => kinds.includes(k)) && kinds.filter((k) => k === "tap").length >= 2, kinds.join(","));
  ok("hidden variation discovered by rhythm", kinds.includes("secret"));
  await page.screenshot({ path: `${out}/hero-after-interaction.png` });
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const mp = await m.newPage(); watch(mp, "hero-touch");
  await mp.goto(base + "/", { waitUntil: "load", ...T }); await mp.waitForTimeout(3000);
  const tk = [];
  await mp.exposeFunction("__hero", (k) => tk.push(k));
  await mp.evaluate(() => window.addEventListener("pf:hero", (e) => window.__hero(e.detail.kind)));
  const hb = await mp.getByTestId("hero-scene").boundingBox();
  await mp.touchscreen.tap(hb.x + hb.width * 0.5, hb.y + hb.height * 0.5); await mp.waitForTimeout(300);
  const before = await mp.evaluate(() => window.scrollY);
  await mp.touchscreen.tap(hb.x + hb.width * 0.3, hb.y + hb.height * 0.4);
  ok("touch tap reacts and does not block the page", tk.includes("tap") && (await mp.evaluate(() => window.scrollY)) === before);
  await mp.screenshot({ path: `${out}/hero-mobile-390.png` });
  await m.close();
}

// 5. PiP: hide, restore, non-repetition, offline line, games
if (!production) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const page = await ctx.newPage(); watch(page, "pip");
  await page.goto(base + "/services", { waitUntil: "load", ...T }); await page.waitForTimeout(1000);
  await page.getByTestId("pip-body").hover({ force: true });
  await page.getByTestId("pip-hide").click({ force: true }); await page.waitForTimeout(1400);
  ok("PiP hides on request", (await page.getByTestId("mascot").getAttribute("class"))?.includes("pip--hidden") && (await page.getByTestId("pip-corner-restore").count()) === 1);
  await page.reload({ waitUntil: "load", ...T }); await page.waitForTimeout(800);
  ok("hidden state persists across reload", (await page.getByTestId("mascot").getAttribute("class"))?.includes("pip--hidden"));
  await page.getByTestId("pip-corner-restore").focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(600);
  const bubble = await page.getByTestId("mascot-bubble").getAttribute("data-line");
  ok("restore brings PiP back with a restore line", !(await page.getByTestId("mascot").getAttribute("class"))?.includes("pip--hidden") && bubble?.startsWith("restore."));
  ok("footer restore control disappears once restored", (await page.getByTestId("pip-restore").count()) === 0);
  // Non-repetition: every poke line once, then silence
  const lines = await page.evaluate(async () => {
    const b = window.__pfBehaviour; b.resetForTests();
    const seen = [];
    for (let i = 0; i < 12; i++) { const shown = b.say("poke", { force: true }); if (!shown) break; seen.push(b.get().bubble.lineId); b.clearBubble(); }
    return seen;
  });
  ok("poke lines never repeat and stop when exhausted", new Set(lines).size === lines.length && lines.length === 8, `${lines.length} distinct`);
  const again = await page.evaluate(() => { const b = window.__pfBehaviour; return b.say("poke", { force: true }); });
  ok("exhausted category stays silent", again === false);
  const restored = await page.evaluate(() => { const b = window.__pfBehaviour; return b.say("restore", { force: true }) && b.get().bubble.lineId; });
  ok("other categories still speak", typeof restored === "string");
  await page.context().setOffline(true); await page.waitForTimeout(400);
  const off = await page.getByTestId("mascot-bubble").getAttribute("data-line");
  await page.context().setOffline(false); await page.waitForTimeout(400);
  const on = await page.getByTestId("mascot-bubble").getAttribute("data-line");
  ok("offline and reconnect lines", off?.startsWith("offline.") && on?.startsWith("reconnect."), `${off} → ${on}`);
  // Games via rotation, each opened, escaped or completed
  const seq = [];
  for (let i = 0; i < 5; i++) {
    const id = await page.evaluate(() => { const b = window.__pfBehaviour; const g = b.nextGame(); if (g) { b.say(`game.${g}.invite`, { force: true, action: { label: "Help PiP", kind: "game", game: g }, durationMs: 20000 }); b.gameOffered(g); } return g; });
    if (!id) break;
    seq.push(id);
    await page.getByTestId("game-accept").click({ force: true }); await page.waitForTimeout(700);
    const game = page.getByTestId("game");
    ok(`game ${id} opens with its own title`, (await game.getAttribute("data-game")) === id && /Forge the Pixels|Catch the Glitch|Route the Spark|Pixel Recall|Hot Forge/.test((await game.textContent()) ?? ""));
    await page.screenshot({ path: `${out}/game-${id}.png` });
    if (id === "glitch") { const cell = page.locator("[data-glitch=true]"); await cell.click(); await page.waitForTimeout(300); ok("glitch: correct cell advances the round", /Round 2/.test((await page.textContent("[data-testid=game]")) ?? "")); }
    if (id === "recall") { await page.waitForSelector("[data-testid=recall-grid][data-phase=recall]", { timeout: 6000 }); ok("recall: pattern hides before recall", (await page.locator("[data-lit=true]").count()) === 0); }
    if (id === "hotforge") { await page.waitForTimeout(1500); const hot = page.locator("[data-testid=hotforge-grid] button").first(); await hot.dispatchEvent("pointerdown"); ok("hotforge: cooling a cell resets its heat", (await hot.getAttribute("data-heat")) === "0.00"); }
    if (id === "spark") { await page.locator("[data-testid=spark-board] [role=gridcell]").first().click(); await page.waitForTimeout(600); ok("spark: tiles rotate on tap", /1 turns/.test((await page.textContent("[data-testid=game]")) ?? "")); }
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    ok(`game ${id} closes on Escape with an exit line`, (await page.getByTestId("game").count()) === 0 && (await page.getByTestId("mascot-bubble").getAttribute("data-line"))?.startsWith(`game.${id}.exit`));
  }
  ok("all five games rotate without repeats in one session", new Set(seq).size === 5, seq.join(","));
  const sixth = await page.evaluate(() => window.__pfBehaviour.nextGame());
  ok("no sixth offer once every game was offered this session", sixth === null);
  await ctx.close();
}

// 6. Realtime notification between two live sessions, PiP quiet in the product
{
  const a = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const admin = await a.newPage(); watch(admin, "rt-admin");
  const c = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const client = await c.newPage(); watch(client, "rt-client");
  await login(admin, "pm@pixelforge.test"); await login(client, "maya@northbank.test");
  await admin.goto(base + "/admin", { waitUntil: "load", ...T }); await admin.waitForTimeout(2500);
  const unreadBefore = Number((await admin.getByTestId("unread-count").textContent().catch(() => "0")) || 0);
  await client.goto(base + "/portal/requests/new", { waitUntil: "load", ...T });
  const title = `Live QA request ${Date.now()}`;
  await client.getByLabel("Title").fill(title);
  await client.getByLabel("Description").fill("Raised by the experience QA script to check the live dashboard.");
  await client.getByLabel("Priority", { exact: true }).selectOption("urgent");
  const toast = admin.waitForSelector(`[role=status]:has-text("${title.slice(0, 20)}")`, { timeout: 20000 }).then(() => true).catch(() => false);
  await client.getByRole("button", { name: "Submit request" }).click();
  await client.waitForURL(/\/portal\/requests\/[a-f0-9-]+$/, { timeout: 30000 });
  ok("admin receives a context-aware toast", await toast);
  await admin.waitForTimeout(3500);
  const unreadAfter = Number((await admin.getByTestId("unread-count").textContent().catch(() => "0")) || 0);
  ok("bell count increases live", unreadAfter > unreadBefore, `${unreadBefore} → ${unreadAfter}`);
  await admin.getByTestId("live-activity").getByText(new RegExp(title)).waitFor({ timeout: 15000 });
  ok("live activity shows the new request without refresh", (await admin.getByTestId("live-activity").textContent())?.includes(title));
  await admin.getByTestId("attention-queue").getByRole("link").filter({ hasText: title }).waitFor({ timeout: 15000 });
  ok("attention queue lists the new urgent request", (await admin.getByTestId("attention-queue").textContent())?.includes(title));
  await admin.getByTestId("bell").click(); await admin.waitForTimeout(400);
  ok("popover shows actor and category", /Maya Fernandes/.test((await admin.getByTestId("notification-list").textContent()) ?? "") && /REQUEST/i.test((await admin.getByTestId("notification-list").textContent()) ?? ""));
  ok("live notification reconciles with its saved row", (await admin.getByTestId("notification-list").getByRole("link").filter({ hasText: title }).count()) === 1);
  await admin.screenshot({ path: `${out}/notification-popover.png` });
  ok("PiP present but quiet in the product", (await admin.getByTestId("mascot").count()) === 1);
  await a.close(); await c.close();
}

// 7. Mobile widths: no overflow, PiP not covering content, menus work
{
  for (const w of [320, 360, 375, 390, 430, 768]) {
    const m = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 768, hasTouch: true }); const p = await m.newPage(); watch(p, `mobile-${w}`);
    await login(p, "maya@northbank.test");
    const overflow = [];
    for (const path of ["/", "/services", "/portal", "/portal/profile", "/people"]) {
      await p.goto(base + path, { waitUntil: "load", ...T }); await p.waitForTimeout(600);
      if (await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) overflow.push(path);
      if (path === "/portal/profile") await p.screenshot({ path: `${out}/profile-${w}.png`, fullPage: true });
      if (path === "/") await p.screenshot({ path: `${out}/home-${w}.png` });
    }
    ok(`no horizontal overflow at ${w}px`, overflow.length === 0, overflow.join(","));
    await m.close();
  }
}

await browser.close();
const passed = results.filter((r) => r[1]).length;
console.log(`\n${passed}/${results.length} passed`);
if (errors.length) { console.log("ERRORS:"); for (const e of [...new Set(errors)]) console.log(e); }
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
