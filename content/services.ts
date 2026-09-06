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
    summary: "Marketing sites and company websites designed from the content out and built to load fast on the phones your customers actually own.",
    problem:
      "Most business websites were built from a template, edited by six people over four years, and now load slowly, look dated and convert poorly. Nobody is quite sure what can be changed safely.",
    capability:
      "We design the site around what it has to do, write the structure and copy hierarchy first, then build it as a componentised, accessible frontend with a content layer your team can edit without a developer.",
    outcome:
      "A site that represents the business properly, is fast on real devices, ranks on its own merit and can be extended without a rebuild.",
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
    slug: "shopify-development",
    index: "02",
    title: "Shopify Development",
    summary: "Custom themes, section architecture, Liquid, and Shopify API work for stores that have outgrown what a stock theme can do.",
    problem:
      "Off-the-shelf themes and a stack of apps get a store live, but every new feature becomes a workaround, the theme editor fights the merchant, and page speed slides with each installed app.",
    capability:
      "We build and customise Shopify themes with clean Liquid sections, metafield-driven templates and JavaScript written for the storefront rather than copied from a plugin. Where a feature needs data, we use the Storefront, Admin and Ajax APIs directly.",
    outcome:
      "A storefront the merchant can actually manage from the theme editor, with fewer apps, faster pages and custom features that behave like part of the platform.",
    technologies: ["shopify", "liquid", "shopify-apis", "javascript", "html-css", "performance"],
    deliverables: ["Theme design and development", "Section and block architecture", "Metafield and content modelling", "Custom cart, search and product logic", "App and third-party integrations", "Speed and conversion review"],
    body: [
      "Shopify is a strong platform when it is used as intended. Most stores we inherit are fighting it: templates duplicated for each product type, JavaScript from five apps competing on the same page, and a merchant who is afraid to open the theme editor.",
      "Our theme work is built on Online Store 2.0 conventions. Sections and blocks are designed so the merchant can compose pages without breaking them, and templates read from metafields rather than hardcoded content.",
      "For anything beyond the theme, we work with Shopify's APIs directly. That covers custom cart behaviour, product configurators, wholesale logic, integrations with fulfilment and marketing tools, and headless builds where they are justified.",
    ],
    faqs: [
      { q: "Can you work on our existing theme?", a: "Usually, yes. We audit it first and tell you honestly whether it is worth extending or should be rebuilt." },
      { q: "Do you build headless Shopify stores?", a: "Only when there is a real reason, such as a content-heavy brand site with commerce inside it. For most merchants a well-built theme is faster to run and cheaper to maintain." },
      { q: "Will you help reduce our app count?", a: "Yes. Replacing an app with a few hundred lines of Liquid and JavaScript is often the single largest speed improvement available." },
    ],
  },
  {
    slug: "web-applications",
    index: "03",
    title: "Web Applications",
    summary: "Customer portals, internal tools and product backends built with Node.js, Laravel and React, typed and tested.",
    problem:
      "The business runs on spreadsheets, a legacy admin panel and a process only one person understands. Buying software does not fit, and the last custom build was abandoned by its developer.",
    capability:
      "We design and build web applications with a clear data model, authentication, role-based access and a frontend that is pleasant to use every day. Backends in Node.js or Laravel, interfaces in React, documented and version-controlled.",
    outcome:
      "Software that fits the way the business actually works, with an API that other tools can connect to and code a future team can take over.",
    technologies: ["nodejs", "laravel", "php", "react", "typescript", "rest-apis"],
    deliverables: ["Product discovery and data modelling", "API design and backend build", "Authentication and permissions", "Admin and customer interfaces", "Integrations with existing systems", "Documentation and handover"],
    body: [
      "Custom software earns its place when the workflow is specific to the business. We start by mapping that workflow honestly, including the parts people do by hand today, before writing a line of code.",
      "We favour boring, well-understood foundations: Laravel or Node.js on the backend, React on the front, relational data, and an API layer between them so the application can grow in either direction.",
      "Every build includes the unglamorous parts that make software trustworthy: validation, permissions, error handling, logs and a deployment pipeline.",
    ],
    faqs: [
      { q: "Do you take over applications built by someone else?", a: "Yes, after a code review so we can tell you what shape it is in and what it will cost to move forward." },
      { q: "Node.js or Laravel?", a: "Whichever suits the team that will maintain it and the systems it has to talk to. We use both regularly." },
    ],
  },
  {
    slug: "ui-ux-design",
    index: "04",
    title: "UI & UX Design",
    summary: "Interface design grounded in how people actually use the product, delivered as a system rather than a set of screens.",
    problem:
      "The product works but people struggle with it. The interface grew feature by feature, nothing is consistent, and each new screen takes longer to design than the last.",
    capability:
      "We audit the current experience, restructure the journeys that matter, and design a component system with tokens for colour, type, spacing and states. Screens are designed for real content and real edge cases, then prototyped where the interaction is unclear.",
    outcome:
      "A product that is easier to use and easier to extend, with a design system engineers can implement without guesswork.",
    technologies: ["html-css", "react", "tailwind", "typescript"],
    deliverables: ["UX audit and journey mapping", "Wireframes and flows", "Design tokens and component library", "High-fidelity screens", "Interactive prototypes", "Developer handoff documentation"],
    body: [
      "Good interface design is mostly decisions about hierarchy: what matters most on this screen, what the person is trying to do, and what should get out of the way. We make those decisions explicitly and write them down.",
      "Because we also build, our design work is shaped by what will ship well. Components are designed with their states, responsive behaviour and content limits from the start.",
    ],
    faqs: [
      { q: "Can you design for a product we are building in-house?", a: "Yes. We deliver a token system, components and annotated screens that an internal engineering team can implement." },
    ],
  },
  {
    slug: "optimisation-and-improvement",
    index: "05",
    title: "Optimisation & Improvement",
    summary: "Performance, accessibility, conversion and code-health work on products that already exist and need to get better.",
    problem:
      "The site or store is live and earning, but it is slow, hard to maintain, or leaking conversions somewhere between landing and checkout. A full rebuild is not on the table.",
    capability:
      "We measure first: Core Web Vitals on real devices, accessibility audits, analytics and session review. Then we work through a prioritised list, shipping improvements in small, reviewed releases.",
    outcome:
      "A faster, more accessible product with measurable improvements, delivered without a rebuild or a pause on trading.",
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
    title: "Integrations & Automation",
    summary: "Connecting storefronts, CRMs, ERPs, payment and marketing tools so data moves without someone re-typing it.",
    problem:
      "Orders are copied into the accounting system by hand, the CRM does not know who bought what, and three tools each hold a different version of the customer.",
    capability:
      "We build integrations using each platform's APIs and webhooks, with retries, logging and monitoring, so the connection keeps working after launch. Where no API exists, we design a sensible workaround and document it.",
    outcome:
      "Systems that agree with each other, fewer manual steps, and a clear record of what moved where and when.",
    technologies: ["nodejs", "rest-apis", "shopify-apis", "laravel", "php"],
    deliverables: ["Integration mapping and data contracts", "API and webhook development", "Scheduled sync and automation", "Error handling and alerting", "Documentation for operations teams"],
    body: [
      "Integration work is invisible when it works and expensive when it does not. We design each connection with failure in mind: idempotent operations, retries, and logs a non-developer can read.",
    ],
    faqs: [
      { q: "Which platforms can you connect?", a: "Anything with an API or webhooks. Common requests involve Shopify, payment providers, email and CRM tools, and accounting or fulfilment systems." },
    ],
  },
];
