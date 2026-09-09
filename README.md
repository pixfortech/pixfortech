# Pixel Forge Technologies — website

Production website for Pixel Forge Technologies, a web engineering and digital product studio.
Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and Motion.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
npm test         # vitest unit tests
npx tsc --noEmit # typecheck
```

Copy `.env.example` to `.env.local` and set the values you need. Without an enquiry transport the contact form logs submissions to the server console in development and returns an error in production.

## Where things live

| Path | Purpose |
| --- | --- |
| `content/` | All editable content: site facts, services, projects, articles, roles, process, technologies. No UI code. |
| `src/lib/content.ts` | The only module that reads `content/`. Swap this for a headless CMS client without touching pages. |
| `src/app/` | Routes. Each page reads through `src/lib/content.ts` and builds metadata with `src/lib/seo.ts`. |
| `src/components/hero/` | The Canvas 2D hero scene (`forge-scene.ts` renderer, `ForgeCanvas.tsx` host). |
| `src/pixel/` | The site-wide pixel system: engine, reveals, themes, behaviour controller, mascot, counter, mini game. See below. |
| `src/components/enquiry/` | Multi-step enquiry form. Validation lives in `src/lib/enquiry-schema.ts`, delivery in `src/lib/enquiry-delivery.ts`. |
| `src/app/globals.css` | Design tokens (colour, type, spacing, radius, elevation, motion, breakpoints) and base utilities. |
| `src/server/` | The platform backend: `db/` (Drizzle schema, migrations, connection), `auth/` (better-auth config, permissions, session helpers), `services/` (tenancy-aware business logic), `actions/` (validated Server Actions), `storage/` (local/S3 drivers, signed downloads), `realtime/` (event bus), `email.ts`. |
| `src/app/portal/`, `src/app/admin/` | Client portal and admin dashboard routes. Both read the session on the server and render nothing for the wrong role. |
| `src/app/(auth)/` | Login, forgot/reset password, email verification. |
| `src/components/app/`, `src/components/workspace/` | Product UI kit (shell, toasts, notification bell, command palette) and feature components (kanban, chat, requests, files, approvals, forms). |
| `src/proxy.ts` | Edge redirect for unauthenticated `/portal` and `/admin` hits. Authorisation itself is always re-checked on the server. |
| `scripts/` | Seed script, cover-art generator and visual QA helpers (screenshots, interaction checks) using the local Chromium. |

## Scroll forging

Content is forged as a pure function of scroll position. `src/pixel/reveal-logic.ts` holds the maths: every `[data-forge]` element assembles left to right while it crosses a band near the bottom of the viewport (`forgeBand`), freezes the instant scrolling stops, and unforges right to left when scrolled back. There are no timers or autonomous animations. The reveal manager sets a `--forge` custom property per element (CSS `clip-path`) and draws a few columns of pixel blocks around the front on the overlay canvas. Reduced motion skips the pixel blocks and keeps the state changes.

## Client portal and admin platform

The site also hosts a client portal (`/portal`) and an admin dashboard (`/admin`).

**Stack**: better-auth (email + password, forgot/reset, email verification, magic links, optional Google), Drizzle ORM on SQLite (`better-sqlite3`, WAL mode, migrations applied on boot), Server Actions validated with Zod, Server-Sent Events for realtime, private file storage on disk or S3.

**Profiles and public pages**: every account has a display identity (name, display name, title, timezone, bio, LinkedIn/GitHub/website, avatar) and a unique username (`src/lib/profile/identity.ts` holds the rules, `src/lib/profile/reserved.ts` the reserved names). Staff can choose a public address and publish a page at `/people/<slug>`; old addresses redirect permanently through `profile_slug_history`. Client profiles are always private. Authorisation never reads usernames or slugs.

**Owner bootstrap**: `npm run admin:check` and `npm run admin:bootstrap` (see `docs/DEPLOYMENT.md`).

**Roles**: `super_admin`, `admin`, `project_manager`, `team_member` (staff, land in `/admin`) and `client_admin`, `client_member` (clients, land in `/portal`). Every read and write goes through `src/server/services/*`, which resolve the actor's accessible projects (`accessibleProjectIds` / `requireProject`) before touching data. Clients only ever see their own organisation's projects, requests, files, conversations and approvals. Internal comments and internal conversations are filtered out at query level for clients, not hidden in the UI.

**Data model** (`src/server/db/schema.ts`): users, sessions, accounts, verifications, organisations, organisation memberships, projects, project members, milestones, tasks, task comments, feature/change requests, request comments, files, conversations, messages, message reads, approvals, notifications, notification preferences, activity log, audit log, invitations. Foreign keys are enforced. The schema uses portable column types so it can move to Postgres by swapping the Drizzle driver and regenerating migrations.

**Realtime**: `src/server/realtime/bus.ts` is an in-process event bus with audience scoping (users, projects, organisations, staff). `/api/realtime` streams matching events over SSE; the client provider refreshes the affected views, shows toasts, updates unread badges and, only after the user opts in from Settings, raises browser notifications. For multiple Node instances, replace the bus with Redis pub/sub or a hosted channel service behind the same `publish` / `subscribe` interface.

**Files**: uploads are validated by extension allowlist, declared MIME, magic bytes, SVG content and size (25 MB), then stored under random keys outside `/public`. Downloads go through `/api/files/[id]`, which checks project access and either streams from disk or redirects to a short-lived presigned S3 URL. A malware-scan hook (`scanUpload`) is in place for wiring a scanner.

### Local setup

```bash
cp .env.example .env.local     # set DATABASE_URL to a local PostgreSQL and BETTER_AUTH_SECRET
npm run db:migrate             # applies drizzle/postgres migrations (node-postgres for localhost, Neon otherwise)
DATABASE_PATH=./data/qa-fixture.sqlite node scripts/seed.mjs && DATABASE_PATH=./data/qa-fixture.sqlite npm run db:import-sqlite
npm run dev
npm run test:integration       # profile slug and bootstrap suites against the local database
node scripts/experience-qa.mjs # browser QA for login/account, profiles, hero, PiP, games, realtime, mobile
```

Demo logins (password `forge-demo-2026!`): `admin@pixelforge.test` (super admin), `pm@pixelforge.test` (project manager), `dev@pixelforge.test` and `design@pixelforge.test` (team), `maya@northbank.test` (client admin, Northbank), `tom@northbank.test` (client member), `daniel@meridian.test` (client admin, Meridian). Delete `data/pixelforge.sqlite` and reseed to reset.

Without `RESEND_API_KEY`, verification, reset and invitation emails are printed to the server console with their links. `npm run db:generate` produces a new migration after schema changes.

### Production checklist

- Set `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and a persistent `DATABASE_PATH` (or port to Postgres).
- Use `STORAGE_DRIVER=s3` with a private bucket, or mount a persistent volume at `STORAGE_DIR`.
- Set `REQUIRE_EMAIL_VERIFICATION=true` and create the first super admin with the seed script or by inviting through `/admin/team`.
- Serve behind HTTPS; cookies are `Secure` in production and sessions are stored server-side.
- Run `npm run qa:app` against a seeded instance for the end-to-end auth, isolation and realtime checks.

## PiP, games and microcopy

- `src/pixel/behaviour/messages.ts` is PiP's speech library: every line has a stable id, grouped by context, plus per-game invite/start/win/lose/exit lines. `selection.ts` holds the pure rotation rules (no repeats until a category is exhausted, a 14-day expiry, game rotation across sessions and visits) and is unit tested.
- `store.ts` persists what a visitor has heard in `localStorage`, session caps in `sessionStorage`, and mirrors a signed-in user's copy through `/api/experience` so they never hear a repeat on another device. Hiding PiP is persistent; the footer link and the corner pixel bring him back.
- `src/pixel/game/` holds the five mini-games behind one `GameHost` shell (consent first, Escape closes, keyboard and touch, no sound, reduced motion respected).
- `src/pixel/scenes/PipScene.tsx` draws a different PiP composition for each public page in the page's palette.
- `content/microcopy.ts` is the brand microcopy registry (navigation, auth, profile, dashboard, notifications, empty states). Functional labels and legal text stay literal in their components.

## The pixel system

Everything playful runs through one engine (`src/pixel/engine.ts`) that owns two fixed canvases: a background field behind the content and a foreground overlay above it. Nothing per-pixel touches the DOM.

- **Field**: ambient particles with a per-route personality (`themes.ts`, `behaviours.ts`). Pointer speed matters: a slow pointer attracts, a fast one scatters; taps send a ripple. Quality tiers (`quality.ts`) adapt particle counts to the device and go fully static under `prefers-reduced-motion`.
- **Reveals**: `PixelReveal` (and the compatible `Reveal` wrapper) register elements with `reveals.ts`. Two IntersectionObservers give hysteresis: content assembles when meaningfully in view and deconstructs only after leaving by a margin, in either direction, reversing smoothly mid-flight. Construction blocks are drawn on the overlay in the style the current theme specifies (sweep, scatter, rise, grid, edge). Reduced motion keeps the state changes and drops the blocks and transforms.
- **Transitions**: `PixelProvider` intercepts internal link clicks, forges the page out in the current palette, navigates, and forges the next page in with its palette.
- **Project themes**: every project in `content/projects.ts` carries a `pixelTheme`. Hovering or focusing a card on the Work page previews it; opening the project applies it to the field, reveals, transitions and the mascot's accent. Derive real themes from client brand assets.
- **Behaviour controller** (`behaviour/store.ts`): a small external store with priorities, per-key cooldowns and session caps, persisted in `sessionStorage` under `pf:pip`. `BehaviourObserver.tsx` feeds it from route changes, pointer, scroll samples, form focus and inactivity. Pure heuristics live in `behaviour/heuristics.ts` and are unit tested.
- **Pip, the mascot** (`mascot/`): a 12×12 cell character with a state machine (idle, curious, forging, guiding, celebrating, bored, dizzy, playing, lost, sleeping). It hides while forms are active or the menu is open, tucks away during touch scrolling, and can be dismissed for the session. Speech is decorative and hidden from assistive technology; the only announced controls are real buttons.
- **Counter** (`counter.ts`, `PixelCounter.tsx`): pixels forged = viewport × devicePixelRatio × page height × furthest scroll. Shown as a compact pill on desktop and an exact figure in the footer.
- **Mini game** (`game/PixelGame.tsx`): "Forge the pixels", offered once after a long dwell and used inline on the 404 page. Pointer, touch or arrow keys; Escape closes; no sound.
- **Microcopy** (`behaviour/messages.ts`): every mascot line, grouped by context.

Run `npm test` for the deterministic parts (counter maths, scroll-loop detection, dwell trigger, cooldowns, reveal state machine, theme resolution, quality tiers). `scripts/pixel-qa.mjs`, `scripts/mascot-qa.mjs` and `scripts/behaviour-qa.mjs` drive the real browser.

## Editing content

- **Services**: `content/services.ts`. Each service needs a slug, index, summary, problem, capability, outcome, deliverables, body paragraphs, technologies (slugs from `content/technologies.ts`) and FAQs.
- **Projects / case studies**: `content/projects.ts`. Entries are currently **layout placeholders** flagged with `placeholder: true`. They render with a visible "Sample layout" label, are `noindex`, and are excluded from the sitemap. Replace them with approved client work, set `placeholder: false`, and add `results` only when the client has verified the figures.
- **Articles**: `content/articles.ts`. Body is markdown-lite: `## ` headings, `- ` bullets, `1. ` numbered items, blank lines between paragraphs.
- **Roles**: `content/careers.ts`.
- **Site facts** (name, domain, email, timezone, social links): `content/site.ts`.

Search the `content/` directory and `src/` for `OWNER_VERIFY` to find every value that must be confirmed by the studio before launch.

## SEO

Metadata, canonical URLs, Open Graph and Twitter cards are built per page with `pageMetadata()`. Structured data covers Organization, WebSite, ProfessionalService, Service, FAQPage, Article and BreadcrumbList. `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, the favicon and Open Graph images are generated from code in `src/app/`.

## Accessibility and motion

Semantic landmarks, a skip link, visible focus states, keyboard-operable menu, accordion and form, labelled inputs with inline errors, and `aria-live` status messages. All motion runs through a root `MotionConfig` that honours `prefers-reduced-motion`; the hero scene renders a static assembled frame in that case and simplifies on small or low-power devices.
