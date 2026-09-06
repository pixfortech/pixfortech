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
| `src/components/enquiry/` | Multi-step enquiry form. Validation lives in `src/lib/enquiry-schema.ts`, delivery in `src/lib/enquiry-delivery.ts`. |
| `src/app/globals.css` | Design tokens (colour, type, spacing, radius, elevation, motion, breakpoints) and base utilities. |
| `scripts/` | Cover-art generator and visual QA helpers (screenshots, interaction checks) using the local Chromium. |

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
