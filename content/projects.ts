import type { Project } from "./types";
import type { PixelTheme } from "../src/pixel/types";

/**
 * Case studies.
 *
 * IMPORTANT: The entries below are LAYOUT PLACEHOLDERS. They demonstrate the
 * case-study structure with generic, clearly labelled sample content. They do
 * not describe real clients or results. Replace each with approved client work,
 * set `placeholder: false`, and add owner-verified `results` if any exist.
 * Placeholder projects are excluded from the sitemap and structured data.
 */

const sample = (heading: string, body: string[], list?: string[]) => ({ heading, body, list });

/**
 * Sample pixel identities. Each reads as a different world inside the same
 * Pixel Forge universe: warm and modular for retail, cool and ordered for
 * professional services, electric and lattice-like for a logistics product.
 * Replace with palettes derived from the real client's brand assets.
 */
const clayAndCream: PixelTheme = {
  primary: "#f2a07b", secondary: "#4a3630", accent: "#ffe9d6", background: "#f2a07b",
  geometry: "dot", density: 0.55, behaviour: "cluster", speed: 0.8, size: 7,
  transitionStyle: "rise", mascotVariation: "warm", seed: 11,
};
const steelAndPaper: PixelTheme = {
  primary: "#7fa7c9", secondary: "#2b3440", accent: "#e3edf5", background: "#5a7f9e",
  geometry: "square", density: 0.4, behaviour: "grid", speed: 0.5, size: 5,
  transitionStyle: "sweep", mascotVariation: "cool", seed: 23,
};
const voltAndAmber: PixelTheme = {
  primary: "#8b96ff", secondary: "#262a3f", accent: "#ffc861", background: "#5560d6",
  geometry: "diamond", density: 0.65, behaviour: "lattice", speed: 1.3, size: 6,
  transitionStyle: "grid", mascotVariation: "cool", seed: 37,
};

export const projects: Project[] = [
  {
    slug: "sample-shopify-storefront",
    title: "Sample: Shopify storefront rebuild",
    client: "Client name",
    industry: "Retail",
    year: "2026",
    services: ["Shopify Development", "UI & UX Design", "Optimisation"],
    technologies: ["shopify", "liquid", "shopify-apis", "javascript", "performance"],
    outcome: "Placeholder outcome statement. Replace with an owner-approved, non-invented result.",
    summary:
      "This is a placeholder case study that shows how a Shopify theme rebuild would be presented: the store's starting point, the section architecture we designed, and how the merchant runs it today.",
    cover: { src: "/work/sample-01.svg", alt: "Abstract modular composition in molten orange and graphite", width: 1600, height: 1200 },
    placeholder: true,
    published: true,
    featured: true,
    pixelTheme: clayAndCream,
    sections: {
      context: sample("Context", ["Describe the client, what they sell, the size of the catalogue and the team that runs the store. Keep it to what a prospect needs to recognise their own situation."]),
      challenge: sample("Challenge", ["Explain the problems with the existing store: theme limitations, app load, slow pages, a merchant who cannot edit pages safely. Be specific and avoid blame."]),
      objective: sample("Objective", ["State the agreed goals in plain language. Where numeric targets exist and are approved for publication, list them here."]),
      strategy: sample("Strategy", ["Outline the plan: audit, section architecture, app reduction, custom features built on Shopify APIs, staged launch."], ["Theme audit and app inventory", "Section and metafield model", "Phased rollout on a duplicate theme"]),
      ux: sample("UX", ["Describe the journeys that were restructured: collection browsing, product selection, cart and checkout customisation."]),
      visual: sample("Visual direction", ["Describe the design system: type, colour, product photography treatment and how the storefront reflects the brand."]),
      engineering: sample("Engineering", ["Describe the build: Online Store 2.0 sections, Liquid templates driven by metafields, JavaScript written for the storefront, Ajax cart, and any Storefront or Admin API work."], ["Liquid sections and blocks", "Metafield-driven templates", "Custom cart and search"]),
      responsive: sample("Responsive experience", ["Describe how the store behaves on small screens, including navigation, filters and the cart."]),
      performance: sample("Performance", ["Describe the performance work and how it was measured. Only publish figures the owner has verified."]),
    },
  },
  {
    slug: "sample-company-website",
    title: "Sample: Company website and design system",
    client: "Client name",
    industry: "Professional services",
    year: "2026",
    services: ["Website Design & Development", "UI & UX Design"],
    technologies: ["nextjs", "react", "typescript", "tailwind", "performance"],
    outcome: "Placeholder outcome statement. Replace with an owner-approved, non-invented result.",
    summary:
      "A placeholder case study for a marketing website: content strategy, a token-based design system, and a Next.js build with a headless content layer.",
    cover: { src: "/work/sample-02.svg", alt: "Abstract grid of graphite modules with a single molten highlight", width: 1600, height: 1200 },
    placeholder: true,
    published: true,
    featured: true,
    pixelTheme: steelAndPaper,
    sections: {
      context: sample("Context", ["Describe the organisation, its audience and why the website matters commercially."]),
      challenge: sample("Challenge", ["Describe the state of the previous site and what was holding the organisation back."]),
      objective: sample("Objective", ["State the goals agreed in discovery."]),
      strategy: sample("Strategy", ["Outline the content-first approach, page hierarchy and the decision on stack."], ["Content audit", "Information architecture", "Design tokens before screens"]),
      ux: sample("UX", ["Describe the navigation model, key journeys and how enquiry was designed."]),
      visual: sample("Visual direction", ["Describe the typographic system, colour and imagery direction."]),
      engineering: sample("Engineering", ["Describe the Next.js build, the content layer and how editors publish."], ["Next.js App Router", "Typed content layer", "Image and font optimisation"]),
      responsive: sample("Responsive experience", ["Describe mobile-specific decisions."]),
      performance: sample("Performance", ["Describe the performance budget and results, if verified."]),
    },
  },
  {
    slug: "sample-web-application",
    title: "Sample: Customer portal web application",
    client: "Client name",
    industry: "Logistics",
    year: "2026",
    services: ["Web Applications", "Integrations & Automation"],
    technologies: ["laravel", "php", "react", "typescript", "rest-apis"],
    outcome: "Placeholder outcome statement. Replace with an owner-approved, non-invented result.",
    summary:
      "A placeholder case study for a custom web application: data modelling, a Laravel API, a React interface and integrations with existing systems.",
    cover: { src: "/work/sample-03.svg", alt: "Abstract modular composition with cool violet and warm orange blocks", width: 1600, height: 1200 },
    placeholder: true,
    published: true,
    featured: true,
    pixelTheme: voltAndAmber,
    sections: {
      context: sample("Context", ["Describe the business process the application supports and who uses it."]),
      challenge: sample("Challenge", ["Describe the manual workflow, spreadsheets or legacy tooling being replaced."]),
      objective: sample("Objective", ["State what the application had to achieve."]),
      strategy: sample("Strategy", ["Outline discovery, data modelling and phased delivery."], ["Workflow mapping", "Data model and permissions", "Phased release"]),
      ux: sample("UX", ["Describe the interface decisions for daily users and administrators."]),
      visual: sample("Visual direction", ["Describe the interface system and how it relates to the brand."]),
      engineering: sample("Engineering", ["Describe the Laravel backend, API design, React frontend and integration layer."], ["Laravel API with role-based access", "React interface", "Webhook integrations"]),
      responsive: sample("Responsive experience", ["Describe how the application works on tablets and phones for field users."]),
      performance: sample("Performance", ["Describe reliability, monitoring and any verified performance results."]),
    },
  },
];
