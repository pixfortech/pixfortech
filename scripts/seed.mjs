// Seeds a development database with demo organisations, users, projects and
// activity so the portal and admin can be exercised end to end.
// Usage: node scripts/seed.mjs   (never run against production data)
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "pixelforge.sqlite");
mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Apply migrations (idempotent: drizzle's migrator table is respected by hash).
const dir = path.join(process.cwd(), "drizzle");
db.exec(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)`);
const journal = JSON.parse(readFileSync(path.join(dir, "meta", "_journal.json"), "utf8"));
const applied = new Set(db.prepare(`select hash from "__drizzle_migrations"`).all().map((r) => r.hash));
for (const entry of journal.entries) {
  const sql = readFileSync(path.join(dir, `${entry.tag}.sql`), "utf8");
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(sql).digest("hex");
  if (applied.has(hash)) continue;
  db.transaction(() => {
    for (const stmt of sql.split("--> statement-breakpoint")) if (stmt.trim()) db.exec(stmt);
    db.prepare(`insert into "__drizzle_migrations" (hash, created_at) values (?, ?)`).run(hash, entry.when);
  })();
}

const exists = db.prepare(`select count(*) n from organisations`).get().n;
if (exists) { console.log("Database already seeded; nothing to do."); process.exit(0); }

const now = Date.now();
const day = 86400000;
const id = () => randomUUID();
const ins = (table, row) => {
  const keys = Object.keys(row);
  db.prepare(`insert into ${table} (${keys.join(",")}) values (${keys.map(() => "?").join(",")})`).run(...keys.map((k) => row[k]));
};

const themes = {
  clay: JSON.stringify({ primary: "#f2a07b", secondary: "#4a3630", accent: "#ffe9d6", background: "#f2a07b", geometry: "dot", density: 0.55, behaviour: "cluster", speed: 0.8, size: 7, transitionStyle: "rise", mascotVariation: "warm", seed: 11 }),
  steel: JSON.stringify({ primary: "#7fa7c9", secondary: "#2b3440", accent: "#e3edf5", background: "#5a7f9e", geometry: "square", density: 0.4, behaviour: "grid", speed: 0.5, size: 5, transitionStyle: "sweep", mascotVariation: "cool", seed: 23 }),
  volt: JSON.stringify({ primary: "#8b96ff", secondary: "#262a3f", accent: "#ffc861", background: "#5560d6", geometry: "diamond", density: 0.65, behaviour: "lattice", speed: 1.3, size: 6, transitionStyle: "grid", mascotVariation: "cool", seed: 37 }),
};

const studio = id(), clientA = id(), clientB = id();
ins("organisations", { id: studio, name: "Pixel Forge Technologies", slug: "pixel-forge", kind: "studio", created_at: now, updated_at: now });
ins("organisations", { id: clientA, name: "Northbank Ceramics (demo)", slug: "northbank-ceramics", kind: "client", industry: "Retail", website: "https://example.com", pixel_theme: themes.clay, notes: "Demo client seeded for development.", created_at: now, updated_at: now });
ins("organisations", { id: clientB, name: "Meridian Logistics (demo)", slug: "meridian-logistics", kind: "client", industry: "Logistics", website: "https://example.org", pixel_theme: themes.volt, notes: "Demo client seeded for development.", created_at: now, updated_at: now });

const PASSWORD = "forge-demo-2026!";
async function user(name, email, role, organisationId, title) {
  const uid = id();
  ins("user", { id: uid, name, email, email_verified: 1, role, organisation_id: organisationId, title, disabled: 0, created_at: now, updated_at: now });
  ins("account", { id: id(), account_id: uid, provider_id: "credential", user_id: uid, password: await hashPassword(PASSWORD), created_at: now, updated_at: now });
  return uid;
}
const superAdmin = await user("Aman Chaurasia", "admin@pixelforge.test", "super_admin", studio, "Founder");
const pm = await user("Priya Nair", "pm@pixelforge.test", "project_manager", studio, "Project manager");
const dev = await user("Rahul Mehta", "dev@pixelforge.test", "team_member", studio, "Frontend engineer");
const designer = await user("Sara Iqbal", "design@pixelforge.test", "team_member", studio, "Product designer");
const clientAdminA = await user("Maya Fernandes", "maya@northbank.test", "client_admin", clientA, "Founder, Northbank Ceramics");
const clientMemberA = await user("Tom Okafor", "tom@northbank.test", "client_member", clientA, "Marketing lead");
const clientAdminB = await user("Daniel Reyes", "daniel@meridian.test", "client_admin", clientB, "Operations director");

function counter(name, value) { db.prepare(`insert into counters (name, value) values (?, ?) on conflict(name) do update set value = excluded.value`).run(name, value); }

// Projects
const p1 = id(), p2 = id(), p3 = id();
ins("projects", { id: p1, organisation_id: clientA, code: "PF-0041", title: "Northbank storefront rebuild", summary: "Shopify theme rebuild with section architecture, metafield-driven templates and a faster product page.", status: "development", priority: "high", health: "on_track", progress: 62, phase: "Build sprint 3", manager_id: pm, start_date: now - 45 * day, target_date: now + 30 * day, pixel_theme: themes.clay, created_by_id: superAdmin, created_at: now - 45 * day, updated_at: now - 1 * day });
ins("projects", { id: p2, organisation_id: clientA, code: "PF-0038", title: "Brand site and design system", summary: "Marketing website on Next.js with a token-based design system the team can extend.", status: "client_review", priority: "medium", health: "at_risk", progress: 84, phase: "Client review", manager_id: pm, start_date: now - 90 * day, target_date: now + 10 * day, pixel_theme: themes.steel, created_by_id: superAdmin, created_at: now - 90 * day, updated_at: now - 2 * day });
ins("projects", { id: p3, organisation_id: clientB, code: "PF-0044", title: "Meridian customer portal", summary: "Laravel API and React portal for shipment tracking, documents and approvals.", status: "design", priority: "urgent", health: "on_track", progress: 28, phase: "Design", manager_id: pm, start_date: now - 20 * day, target_date: now + 75 * day, pixel_theme: themes.volt, created_by_id: superAdmin, created_at: now - 20 * day, updated_at: now - 3 * day });
counter("project", 44);
for (const [pid, members] of [[p1, [[dev, "member"], [designer, "member"], [clientAdminA, "client"], [clientMemberA, "client"]]], [p2, [[designer, "member"], [clientAdminA, "client"]]], [p3, [[dev, "member"], [designer, "member"], [clientAdminB, "client"]]]]) {
  for (const [u, r] of members) ins("project_members", { project_id: pid, user_id: u, role: r, created_at: now });
}
// Conversations
const conv = {};
for (const [pid, org] of [[p1, clientA], [p2, clientA], [p3, clientB]]) {
  conv[pid] = id();
  ins("conversations", { id: conv[pid], organisation_id: org, project_id: pid, title: "Project chat", internal: 0, created_at: now - 30 * day, last_message_at: now - 1 * day });
  ins("conversations", { id: id(), organisation_id: org, project_id: pid, title: "Internal", internal: 1, created_at: now - 30 * day, last_message_at: now - 4 * day });
}
// Milestones
const ms = [];
const addMs = (pid, title, status, progress, due, start, order, owner, approval = 0) => { const m = id(); ms.push(m); ins("milestones", { id: m, project_id: pid, title, status, progress, owner_id: owner, start_date: start, due_date: due, sort_order: order, client_visible: 1, requires_approval: approval, created_at: now - 40 * day, updated_at: now }); return m; };
addMs(p1, "Discovery and theme audit", "completed", 100, now - 30 * day, now - 45 * day, 0, pm);
addMs(p1, "Section architecture and design", "completed", 100, now - 12 * day, now - 30 * day, 1, designer, 1);
const m13 = addMs(p1, "Theme build", "in_progress", 55, now + 14 * day, now - 12 * day, 2, dev);
addMs(p1, "QA and launch", "planned", 0, now + 30 * day, now + 14 * day, 3, pm, 1);
addMs(p2, "Design system", "completed", 100, now - 40 * day, now - 90 * day, 0, designer, 1);
const m22 = addMs(p2, "Page build and content", "awaiting_approval", 95, now - 2 * day, now - 40 * day, 1, dev, 1);
addMs(p2, "Launch", "planned", 0, now + 10 * day, now, 2, pm);
addMs(p3, "Workflow mapping", "completed", 100, now - 8 * day, now - 20 * day, 0, pm);
addMs(p3, "Interface design", "in_progress", 40, now + 12 * day, now - 8 * day, 1, designer, 1);
addMs(p3, "API and portal build", "planned", 0, now + 60 * day, now + 12 * day, 2, dev);

// Tasks
let tn = 0;
const task = (pid, code, title, status, priority, assignee, due, visible = 0, milestone = null, request = null, desc = null) => {
  tn++; const t = id();
  ins("tasks", { id: t, project_id: pid, milestone_id: milestone, request_id: request, key: `${code}-${tn}`, title, description: desc, status, priority, assignee_id: assignee, due_date: due, labels: JSON.stringify(status === "blocked" ? ["blocked"] : ["build"]), checklist: JSON.stringify([{ text: "Implement", done: status === "done" || status === "in_review" }, { text: "Review", done: status === "done" }]), client_visible: visible, sort_order: tn, created_by_id: pm, completed_at: status === "done" ? now - 2 * day : null, created_at: now - 10 * day, updated_at: now - 1 * day });
  return t;
};
task(p1, "PF-0041", "Product page template with metafield blocks", "in_progress", "high", dev, now + 2 * day, 1, m13, null, "Build the product template using metafield-driven blocks so merchandising can rearrange without a developer.");
task(p1, "PF-0041", "Collection filters (Ajax)", "todo", "medium", dev, now + 6 * day, 1, m13);
task(p1, "PF-0041", "Cart drawer performance pass", "in_review", "medium", dev, now + 1 * day, 0, m13);
task(p1, "PF-0041", "Replace review app with native section", "blocked", "high", dev, now - 1 * day, 0, m13, null, "Waiting on export from the old app.");
task(p1, "PF-0041", "Typography scale in theme settings", "done", "low", designer, now - 3 * day, 1, m13);
task(p2, "PF-0038", "Fix line-height on case study quotes", "todo", "low", designer, now + 3 * day, 0, m22);
task(p2, "PF-0038", "Content load: About page", "in_progress", "medium", pm, now, 1, m22);
task(p3, "PF-0044", "Shipment list wireframes", "in_progress", "urgent", designer, now + 1 * day, 1);
task(p3, "PF-0044", "Auth and roles model", "todo", "high", dev, now + 9 * day, 0);
counter("task:PF-0041", 5); counter("task:PF-0038", 7); counter("task:PF-0044", 9);

// Requests
const reqs = [];
const req = (pid, org, number, title, type, status, priority, requester, assignee, area, desc, created) => {
  const r = id(); reqs.push(r);
  ins("requests", { id: r, organisation_id: org, project_id: pid, number, title, type, description: desc, area, priority, reason: "Needed for the campaign launch.", status, requester_id: requester, assignee_id: assignee, estimate: status === "estimated" || status === "in_progress" ? "About half a day" : null, created_at: created, updated_at: created + day / 2 });
  ins("conversations", { id: id(), organisation_id: org, project_id: pid, request_id: r, title: `PF-REQ-${String(number).padStart(4, "0")} · ${title}`, internal: 0, created_at: created, last_message_at: null });
  ins("activity_events", { id: id(), organisation_id: org, project_id: pid, actor_id: requester, kind: "request.created", summary: `submitted PF-REQ-${String(number).padStart(4, "0")} “${title}”`, target_type: "request", target_id: r, href: `/requests/${r}`, internal: 0, created_at: created });
  return r;
};
const r1 = req(p1, clientA, 139, "Move the mobile navigation CTA above the menu items", "design", "in_progress", "high", clientAdminA, dev, "Header / mobile menu", "On phones the Start a project button sits below the menu links. Customers do not see it. Please move it above the links and make it full width.", now - 6 * day);
req(p1, clientA, 140, "Product images look soft on retina screens", "bug", "under_review", "medium", clientMemberA, pm, "Product page gallery", "Images seem to load at half resolution on iPhone. Attached screenshot.", now - 3 * day);
req(p1, clientA, 141, "Add a size guide drawer to product pages", "feature", "submitted", "medium", clientAdminA, pm, "Product page", "Customers keep asking for measurements. A drawer with a table per product type would do.", now - 1 * day);
req(p2, clientA, 138, "Update the team section copy", "content", "completed", "low", clientAdminA, designer, "About page", "New bios attached in the doc.", now - 15 * day);
req(p3, clientB, 142, "Export shipments to CSV", "feature", "ready_for_review", "high", clientAdminB, dev, "Shipments list", "Operations needs a CSV export filtered by date range and customer.", now - 4 * day);
counter("request", 142);
ins("request_comments", { id: id(), request_id: r1, author_id: pm, body: "Thanks Maya. We can include this in the next build. I will move it up and make it full width on screens under 640px.", internal: 0, created_at: now - 5 * day });
ins("request_comments", { id: id(), request_id: r1, author_id: pm, body: "INTERNAL: This is a 30 minute change in the header partial. Rahul, please pick it up with the cart drawer work.", internal: 1, created_at: now - 5 * day + 3600000 });
ins("request_comments", { id: id(), request_id: r1, author_id: clientAdminA, body: "Perfect. The sooner the better, the campaign starts next week.", internal: 0, created_at: now - 4 * day });
ins("activity_events", { id: id(), organisation_id: clientA, project_id: p1, actor_id: pm, kind: "request.status", summary: "moved PF-REQ-0139 to In progress", target_type: "request", target_id: r1, href: `/requests/${r1}`, internal: 0, created_at: now - 4 * day });

// Messages
const msg = (c, author, body, at) => ins("messages", { id: id(), conversation_id: c, author_id: author, body, created_at: at });
msg(conv[p1], pm, "Morning all. Sprint 3 is underway: product template first, then filters.", now - 3 * day);
msg(conv[p1], clientAdminA, "Great. Can we see the product template on staging by Thursday?", now - 3 * day + 3600000);
msg(conv[p1], dev, "Yes, I will post the staging link here once the metafield blocks are in.", now - 2 * day);
msg(conv[p1], designer, "Type scale is in theme settings now, so merchandising can tune it without code.", now - 1 * day);
msg(conv[p2], pm, "Page build is ready for your review. Approval request is in the Approvals tab.", now - 2 * day);
msg(conv[p3], designer, "Wireframes for the shipment list are attached to the task; comments welcome.", now - 1 * day);
for (const [c, u] of [[conv[p1], pm], [conv[p1], dev], [conv[p2], pm]]) ins("conversation_members", { conversation_id: c, user_id: u, last_read_at: now });

// Approvals
const ap = id();
ins("approvals", { id: ap, organisation_id: clientA, project_id: p2, type: "milestone", title: "Page build and content", description: "All pages built with final content. Please review on staging and approve for launch.", milestone_id: m22, version_label: "v1.2", status: "pending", requested_by_id: pm, due_date: now + 3 * day, created_at: now - 2 * day });
const ap2 = id();
ins("approvals", { id: ap2, organisation_id: clientA, project_id: p1, type: "design", title: "Section architecture and design", description: "Figma file with the new section system.", version_label: "v2", status: "approved", requested_by_id: designer, created_at: now - 14 * day, decided_at: now - 12 * day });
ins("approval_decisions", { id: id(), approval_id: ap2, user_id: clientAdminA, decision: "approved", comment: "Looks right. Go ahead.", version_label: "v2", created_at: now - 12 * day });

// Notifications for demo users
const notif = (userId, category, title, body, href, pid, actor, at, read = null) => ins("notifications", { id: id(), user_id: userId, category, title, body, href, project_id: pid, actor_id: actor, read_at: read, created_at: at });
notif(pm, "request", "New change request · PF-REQ-0141", "Northbank storefront rebuild: “Add a size guide drawer to product pages”", `/requests/${reqs[2]}`, p1, clientAdminA, now - 1 * day);
notif(pm, "approval", "Awaiting decision: Page build and content", "Brand site and design system", `/projects/${p2}/approvals`, p2, null, now - 2 * day, now - 1 * day);
notif(clientAdminA, "approval", "Approval requested: Page build and content", "Brand site and design system · Milestone", `/projects/${p2}/approvals`, p2, pm, now - 2 * day);
notif(clientAdminA, "request", "PF-REQ-0139 is now In progress", "Move the mobile navigation CTA above the menu items", `/requests/${r1}`, p1, pm, now - 4 * day, now - 3 * day);
notif(dev, "task", "You were assigned PF-0041-1", "Product page template with metafield blocks", "/admin/tasks", p1, pm, now - 9 * day, now - 8 * day);

// Activity
const act = (org, pid, actor, kind, summary, at, internal = 0) => ins("activity_events", { id: id(), organisation_id: org, project_id: pid, actor_id: actor, kind, summary, internal, created_at: at });
act(clientA, p1, superAdmin, "project.created", "created project PF-0041 “Northbank storefront rebuild”", now - 45 * day);
act(clientA, p1, pm, "milestone.status", "marked milestone “Section architecture and design” as completed", now - 12 * day);
act(clientA, p1, dev, "task.status", "moved PF-0041-5 to Done", now - 2 * day);
act(clientA, p2, pm, "approval.requested", "requested approval: Page build and content", now - 2 * day);
act(clientB, p3, designer, "file.uploaded", "uploaded shipment-list-wireframes.pdf", now - 1 * day, 0);
ins("audit_events", { id: id(), actor_id: superAdmin, action: "seed", target_type: "database", metadata: JSON.stringify({ demo: true }), created_at: now });

console.log(`Seeded demo data at ${DB_PATH}\n\nSign in with password: ${PASSWORD}\n  super admin      admin@pixelforge.test\n  project manager  pm@pixelforge.test\n  team member      dev@pixelforge.test\n  designer         design@pixelforge.test\n  client admin A   maya@northbank.test\n  client member A  tom@northbank.test\n  client admin B   daniel@meridian.test`);
