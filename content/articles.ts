import type { Article } from "./types";

/**
 * Insights. Original writing by the Pixel Forge Technologies team.
 * Body is markdown-lite: "## " headings, "- " list items, blank-line paragraphs.
 */
export const articles: Article[] = [
  {
    slug: "why-your-shopify-store-is-slow",
    title: "Why your Shopify store is slow, and what actually fixes it",
    description:
      "Most Shopify speed problems are not the platform. They are apps, theme JavaScript and images. Here is how we diagnose a slow store and the order we fix things in.",
    date: "2026-08-18",
    readingTime: "7 min read",
    category: "Shopify",
    author: { name: "Pixel Forge Technologies", role: "Engineering team" },
    published: true,
    body: `Shopify's own infrastructure is fast. When a store feels slow, the cause is almost always in the theme: the scripts that apps inject, the JavaScript the theme itself loads, and images that were never sized for the layout they sit in.

## Start by measuring, not guessing

Run the store through a lab tool such as Lighthouse on a mid-range Android phone profile, then look at real-user data if you have it. You are looking for three numbers: Largest Contentful Paint, Cumulative Layout Shift and Interaction to Next Paint. Write them down before you change anything.

## The app tax

Every app that touches the storefront adds at least one script. Many add several, plus a stylesheet and a font. Ten apps can easily mean thirty requests before the page is interactive. Open the theme's app embeds and the network panel, and list every script by the app that owns it.

- Remove apps that are installed but no longer used. This is the most common win.
- Replace simple apps with a section or a few lines of Liquid. Announcement bars, size charts and trust badges rarely need an app.
- For apps you keep, check whether they offer a lighter integration or can load after the page is interactive.

## Theme JavaScript

Purchased themes ship with JavaScript for every feature they support, whether your store uses it or not. Sliders, quick-view modals, mega menus and product recommendation carousels all load on every page. A custom theme loads what the page needs and nothing else.

## Images

Product photography is usually uploaded at full resolution and then displayed at a quarter of the size. Use Shopify's image_url filters with explicit widths and a srcset, give every image its dimensions so the layout does not shift, and lazy-load anything below the fold.

## Fonts

Two font families with two weights each is plenty. Preload the one used for the largest text, and let the rest load with font-display swap.

## What to do in what order

1. Remove unused apps.
2. Fix image sizing and layout shift.
3. Reduce font weights and preload the hero font.
4. Defer or remove theme JavaScript the page does not use.
5. Replace remaining heavy apps with native features.

Measure again after each step. The order matters because the first three steps are low-risk and usually produce the largest change.`,
  },
  {
    slug: "design-tokens-for-small-teams",
    title: "Design tokens for small teams: the minimum that works",
    description:
      "You do not need a design ops department to benefit from tokens. A short set of decisions about colour, type and spacing keeps a site coherent as it grows.",
    date: "2026-07-22",
    readingTime: "5 min read",
    category: "Design systems",
    author: { name: "Pixel Forge Technologies", role: "Design team" },
    published: true,
    body: `Design tokens have a reputation for being enterprise machinery. In practice they are a list of named decisions: this grey, this type scale, these six spacing values. The point is that a decision made once is reused everywhere rather than remade slightly differently on every page.

## What to tokenise first

- Colour: background surfaces, text levels, one accent, and line colours. Eight to twelve values.
- Type: a display scale using clamp() for fluid sizing, a body size, a small size and a label style.
- Spacing: a 4px base with a short list of multiples, plus a section spacing value.
- Radius, shadow and motion: two or three values each.

## Where tokens live

Put them in CSS custom properties on the root element. Frameworks such as Tailwind can read them directly, and they work in plain CSS, in Liquid templates and inside a headless CMS preview without a build step.

## The rule that keeps it working

If a value is not in the token list, it does not go in the code. When someone genuinely needs a new value, add it to the list with a name and a reason. This is the whole discipline, and it is what stops a site from drifting after launch.

## What it buys you

New pages take hours instead of days because the decisions have already been made. Handovers to a new developer are shorter. Dark and light variants, or a brand refresh, become a change to one file rather than a rebuild.`,
  },
  {
    slug: "accessibility-is-a-build-decision",
    title: "Accessibility is a build decision, not a launch checklist",
    description:
      "The cheapest time to make a site accessible is while it is being designed. Here is how we build WCAG 2.2 conformance into the work rather than auditing it in at the end.",
    date: "2026-06-30",
    readingTime: "6 min read",
    category: "Engineering",
    author: { name: "Pixel Forge Technologies", role: "Engineering team" },
    published: true,
    body: `Retrofitting accessibility is expensive because it means revisiting decisions that were already made: colour pairs, component structure, interaction patterns. Making those decisions correctly the first time costs almost nothing.

## Decide it in the design system

- Every text colour is paired with the backgrounds it may sit on, and each pair meets WCAG contrast ratios. Check this once when the tokens are defined.
- Interactive elements have a visible focus state that is designed, not left to the browser default.
- Tap targets are at least 24 by 24 CSS pixels, with 44 preferred on touch surfaces.
- Motion is treated as an enhancement. Anything that moves respects the reduced-motion preference.

## Build it in the components

Use native HTML elements before reaching for ARIA. A button is a button element, a link is an anchor, and a form field has a label element. Custom components such as accordions and dialogs are built once, tested with a keyboard and a screen reader, and reused.

## Test it continuously

Automated tools catch perhaps a third of real issues. Tab through every page. Turn on a screen reader for the critical journeys. Test the forms with errors present. Do this during the build, not the week before launch.

## Why it matters commercially

Accessible sites are usable by more people, index better because their structure is semantic, and are less fragile because they rely on standards rather than clever workarounds. The overlap between accessibility, performance and SEO work is large enough that we treat them as one discipline.`,
  },
];
