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
| `scripts/` | Cover-art generator and visual QA helpers (screenshots, interaction checks) using the local Chromium. |

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
