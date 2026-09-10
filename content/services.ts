import type { Service } from "./types";

/**
 * Services offered by Pixel Forge Technologies.
 * Each service must be honest about what is delivered. No invented metrics.
 */
export const services: Service[] = [
  {
    slug: "website-design-development",
    index: "01",
    title: "Website Design & Development",
    headline: "Good-looking is the starting line. Working properly is the job.",
    summary: "Distinctive, responsive websites designed around the business rather than whichever template was trending last Tuesday.",
    problem:
      "Most business websites were built from a template, edited by six people over four years, and now load slowly, look dated and convert poorly. Nobody is quite sure what can be changed safely.",
    capability:
      "We design the site around what it has to do, write the structure and copy hierarchy first, then build it as a componentised, accessible frontend with a content layer your team can edit without a developer.",
    outcome:
      "A site that represents the business properly, is fast on real devices, ranks on its own merit and can be extended without a rebuild.",
    cta: "See how we build",
    technologies: ["nextjs", "react", "typescript", "tailwind", "wordpress", "performance"],
    deliverables: ["Information architecture and content hierarchy", "Responsive design system", "Componentised frontend build", "CMS integration and editor training", "SEO structure, metadata and schema", "Performance and accessibility pass"],
    body: [
      "A website is the one piece of marketing every prospect will check. We treat it as a product with a job, and we start from the job: what a visitor should understand in the first ten seconds, what they should be able to do in the first minute, and what the business needs to learn from them.",
      "Design and engineering happen together. The type system, spacing and components are decided as tokens so the site stays coherent when a new page gets added six months later by someone who never met us.",
      "We build with Next.js and React where interactivity or scale justifies it, and with WordPress where an editorial team needs a familiar publishing workflow. Either way the markup is semantic, the images are optimised and the site is tested from 320px up.",
    ],
    faqs: [
      { q: "Do you redesign existing sites or only build new ones?", a: "Both. A redesign usually starts with an audit of what is working, so we keep the URLs and content that earn traffic and rebuild what does not." },
      { q: "Can our team edit the site afterwards?", a: "Yes. Every site ships with a content layer, either a headless CMS or WordPress, and a short handover session." },
      { q: "How long does a website take?", a: "It depends on scope. We agree a timeline in the discovery stage and report against it weekly." },
    ],
  },
  {
    slug: "e-commerce-development",
    index: "02",
    title: "E-commerce Development",
    headline: "Because “Add to Cart” deserves better company.",
    summary: "Online stores designed to make browsing, choosing and buying feel straightforward.",
    problem:
      "The store technically works, but finding the right product takes too many taps, the cart surprises people, and every new feature is another app fighting the theme for page speed.",
    capability:
      "We design and build storefronts around the catalogue and the buying journey: clear collections, product pages that answer the real questions, a cart and checkout that stay out of the way, and integrations that behave like part of the platform.",
    outcome:
      "A store the team can run day to day, that customers can browse on a phone without patience, and that can grow without being rebuilt.",
    cta: "See how we sell",
    technologies: ["shopify", "liquid", "shopify-apis", "javascript", "performance"],
    deliverables: ["Storefront design and development", "Catalogue, collection and product-page structure", "Cart, checkout and ordering journeys", "Payment, shipping and third-party integrations", "Merchant handover and training", "Speed and conversion review"],
    body: [
      "An online store has two customers: the person buying and the person running it. We design for both. Browsing has to be quick and obvious; the back office has to be manageable without a developer on call.",
      "Where the platform is Shopify we work with its conventions: clean theme sections, metafield-driven templates and its APIs for anything custom. Where it is something else, the same discipline applies: fewer moving parts, faster pages, and features that feel native.",
    ],
    faqs: [
      { q: "Can you work on our existing store?", a: "Usually, yes. We audit it first and tell you honestly whether it is worth extending or should be rebuilt." },
      { q: "Do you handle payments, shipping and other integrations?", a: "Yes. Connecting the store to payment providers, shipping and the tools you already use is part of the build." },
    ],
  },
  {
    slug: "graphic-design",
    index: "03",
    title: "Graphic Design",
    headline: "Sometimes the pixels need to leave the browser.",
    summary: "Digital graphics and visual assets built with the same unhealthy respect for alignment.",
    problem:
      "The website looks considered, and then the social posts, banners and decks look like they came from somewhere else entirely. Every new asset is a fresh improvisation.",
    capability:
      "We design the visual assets that travel with a brand online: social graphics, banners, digital ads, presentation visuals and the templates that keep them consistent after we hand over.",
    outcome:
      "Assets that look like they belong to the same company as the website, with a set of templates the team can keep using.",
    cta: "See the visual side",
    technologies: [],
    deliverables: ["Social and campaign graphics", "Web and display banners", "Presentation and pitch visuals", "Reusable templates and asset kits", "Export-ready files for every channel"],
    body: [
      "Good digital graphics are mostly restraint and alignment: a clear hierarchy, a grid that is respected, and type that is set with care. We bring the same eye to a banner that we bring to an interface.",
      "Every asset is delivered in the formats each channel needs, with the source files and a short guide so the next version does not drift.",
    ],
    faqs: [
      { q: "Do you design logos and full brand identities?", a: "Our focus is digital graphics and the assets that sit alongside a website. If your brand needs a ground-up identity, we will say so and help you brief it." },
    ],
  },
  {
    slug: "website-redesign",
    index: "04",
    title: "Website Redesign",
    headline: "Your old website has served bravely. We should probably talk.",
    summary: "We rethink outdated, confusing or underperforming websites without throwing away the parts that still work.",
    problem:
      "The current site was right for the business five years ago. It is slow, awkward on phones, hard to update, and no longer says what the company actually does.",
    capability:
      "We audit what is there, keep the pages, URLs and content that still earn their place, and redesign the rest around today's business: structure first, then the visual layer, then a build that is easier to maintain than the one it replaces.",
    outcome:
      "A site that feels current, works on real devices, keeps the search visibility you already have, and no longer needs a developer for routine changes.",
    cta: "See how a redesign runs",
    technologies: ["nextjs", "react", "wordpress", "html-css", "performance"],
    deliverables: ["Audit of the current site and content", "Redirect and URL continuity plan", "Restructured information architecture", "Redesigned responsive system", "Rebuilt, maintainable frontend", "Launch checklist and handover"],
    body: [
      "A redesign is not a fresh start; it is an inheritance. We map what exists, measure what works, and make a case for each change rather than replacing everything on principle.",
      "The build is planned so nothing that earns traffic breaks on launch day: redirects, metadata and content are carried across deliberately.",
    ],
    faqs: [
      { q: "Will we lose our search rankings?", a: "Not if the redesign is planned properly. Keeping or redirecting every URL that matters is part of the work, not an afterthought." },
      { q: "Can we keep our current content management system?", a: "Often, yes. We recommend a change only when the current system is the thing holding the site back." },
    ],
  },
  {
    slug: "performance-optimisation",
    index: "05",
    title: "Performance & Optimisation",
    headline: "Faster pages. Fewer excuses.",
    summary: "We trim the unnecessary, improve responsiveness and make the experience feel lighter where it matters.",
    problem:
      "The site or store is live and earning, but it is slow, hard to maintain, or leaking conversions somewhere between landing and checkout. A full rebuild is not on the table.",
    capability:
      "We measure first: Core Web Vitals on real devices, accessibility checks, analytics and session review. Then we work through a prioritised list, shipping improvements in small, reviewed releases.",
    outcome:
      "A faster, more accessible product with measurable improvements, delivered without a rebuild or a pause on trading.",
    cta: "See what gets trimmed",
    technologies: ["performance", "javascript", "shopify", "wordpress", "git"],
    deliverables: ["Performance audit and budget", "Accessibility review against WCAG 2.2", "Conversion and UX review", "Technical SEO fixes", "Code cleanup and dependency reduction", "Ongoing improvement retainer"],
    body: [
      "Existing products carry existing revenue, so we work carefully. Every change is measured before and after, shipped behind version control, and reversible.",
      "Typical work includes replacing heavy scripts, fixing layout shift, restructuring images and fonts, correcting semantic markup, and untangling the JavaScript that accumulated over years.",
    ],
    faqs: [
      { q: "Do you offer retainers?", a: "Yes. Many clients keep us on a monthly arrangement for continuous improvement after the initial audit." },
    ],
  },
  {
    slug: "integrations",
    index: "06",
    title: "Integrations",
    headline: "Making different systems speak without shouting at each other.",
    summary: "Practical integrations that connect the parts of your digital setup that should already be working together.",
    problem:
      "Orders are copied into the accounting system by hand, the CRM does not know who bought what, and three tools each hold a different version of the customer.",
    capability:
      "We build integrations using each platform's APIs and webhooks, with retries, logging and monitoring, so the connection keeps working after launch. Where no API exists, we design a sensible workaround and document it.",
    outcome:
      "Systems that agree with each other, fewer manual steps, and a clear record of what moved where and when.",
    cta: "See what connects",
    technologies: ["nodejs", "rest-apis", "shopify-apis", "laravel", "php"],
    deliverables: ["Integration mapping and data contracts", "API and webhook development", "Scheduled sync and automation", "Error handling and alerting", "Documentation for operations teams"],
    body: [
      "Integration work is invisible when it works and expensive when it does not. We design each connection with failure in mind: idempotent operations, retries, and logs a non-developer can read.",
    ],
    faqs: [
      { q: "Which platforms can you connect?", a: "Anything with an API or webhooks. Common requests involve storefronts, payment providers, email and CRM tools, and accounting or fulfilment systems." },
    ],
  },
];
