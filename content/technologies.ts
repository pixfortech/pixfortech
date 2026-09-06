import type { Technology } from "./types";

/**
 * Only technologies Pixel Forge Technologies actually works with.
 * Add a new entry here and reference its slug from services or projects.
 */
export const technologies: Technology[] = [
  { slug: "javascript", name: "JavaScript", group: "frontend", use: "The language underneath every interface we ship, written without framework dogma." },
  { slug: "typescript", name: "TypeScript", group: "frontend", use: "Types on anything that will be maintained by more than one person." },
  { slug: "react", name: "React", group: "frontend", use: "Component-driven interfaces for applications and content-heavy sites." },
  { slug: "nextjs", name: "Next.js", group: "frontend", use: "Server rendering, routing and image optimisation for React products." },
  { slug: "html-css", name: "HTML & CSS", group: "frontend", use: "Semantic markup and hand-written layout, responsive from 320px up." },
  { slug: "tailwind", name: "Tailwind CSS", group: "frontend", use: "Token-based styling that stays consistent across a growing team." },
  { slug: "shopify", name: "Shopify", group: "commerce", use: "Storefronts, checkout customisation and merchant tooling." },
  { slug: "liquid", name: "Shopify Liquid", group: "commerce", use: "Theme architecture, sections and metafield-driven templates." },
  { slug: "shopify-apis", name: "Shopify APIs", group: "commerce", use: "Storefront, Admin and Ajax APIs for custom cart, search and integrations." },
  { slug: "nodejs", name: "Node.js", group: "backend", use: "APIs, integrations, automation and headless backends." },
  { slug: "php", name: "PHP", group: "backend", use: "Custom backends and the language behind WordPress and Laravel work." },
  { slug: "laravel", name: "Laravel", group: "backend", use: "Structured web applications with authentication, queues and admin tooling." },
  { slug: "wordpress", name: "WordPress", group: "backend", use: "Custom themes and editorial sites without plugin bloat." },
  { slug: "rest-apis", name: "REST & Webhooks", group: "platform", use: "Connecting storefronts, CRMs, ERPs and marketing tools." },
  { slug: "performance", name: "Web Performance", group: "platform", use: "Core Web Vitals, asset budgets and rendering strategy." },
  { slug: "git", name: "Git & CI", group: "platform", use: "Versioned work, reviewed pull requests and repeatable deploys." },
];

export const technologyGroups: { key: Technology["group"]; label: string }[] = [
  { key: "frontend", label: "Frontend" },
  { key: "commerce", label: "Commerce" },
  { key: "backend", label: "Backend & CMS" },
  { key: "platform", label: "Platform" },
];
