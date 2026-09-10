/**
 * Content model for Pixel Forge Technologies.
 * These types are the contract between the content directory and the UI.
 * A headless CMS can replace the files in /content by implementing
 * the same shapes inside src/lib/content.ts.
 */

import type { PixelTheme } from "../src/pixel/types";

export type ImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Service = {
  slug: string;
  /** Short display name, e.g. "Shopify Development" */
  title: string;
  /** Two-digit index for section numbering */
  index: string;
  /** One line in the brand voice, shown under the title */
  headline?: string;
  /** One-line summary shown on cards */
  summary: string;
  /** Call to action label for the service page link */
  cta?: string;
  /** Problem the client typically brings */
  problem: string;
  /** What Pixel Forge does about it */
  capability: string;
  /** What the client ends up with */
  outcome: string;
  /** Technology slugs from content/technologies.ts */
  technologies: string[];
  /** Concrete deliverables */
  deliverables: string[];
  /** Longer narrative for the service page (markdown-lite paragraphs) */
  body: string[];
  /** Frequently asked questions */
  faqs: { q: string; a: string }[];
};

export type Technology = {
  slug: string;
  name: string;
  group: "frontend" | "commerce" | "backend" | "platform";
  /** How Pixel Forge uses it, in one sentence */
  use: string;
};

export type CaseStudySection = {
  heading: string;
  body: string[];
  image?: ImageAsset;
  /** Optional technical list, e.g. stack or approach bullets */
  list?: string[];
};

export type Project = {
  slug: string;
  title: string;
  client: string;
  industry: string;
  /** Publication year, only when the owner has confirmed it. */
  year?: string;
  services: string[];
  technologies: string[];
  /** One-line headline in the brand voice, shown on the card and the study. */
  headline?: string;
  /** Short, non-numeric outcome statement */
  outcome: string;
  summary: string;
  /** Live site, when public. */
  url?: string;
  /** Card tags, when they differ from the technology list. */
  tags?: string[];
  /** Card call to action label. */
  cta?: string;
  /** A line from PiP, shown as a caption on the study. */
  pipLine?: string;
  /** Short truthful account of the work, for studies without a full write-up. */
  overview?: string[];
  cover: ImageAsset;
  /**
   * Placeholder projects render with a visible "sample" label and are
   * excluded from the sitemap and structured data. Set to false once
   * the case study describes real, approved client work.
   */
  placeholder: boolean;
  /** Owner-supplied, verified results. Never invent these. */
  results?: { label: string; value: string }[];
  /** Full case-study sections. Optional: a study can be told from `overview` alone. */
  sections?: {
    context: CaseStudySection;
    challenge: CaseStudySection;
    objective: CaseStudySection;
    strategy: CaseStudySection;
    ux: CaseStudySection;
    visual: CaseStudySection;
    engineering: CaseStudySection;
    responsive: CaseStudySection;
    performance: CaseStudySection;
  };
  /** Whether the site owner has approved publishing this study. */
  published: boolean;
  featured: boolean;
  /**
   * The project's own pixel identity. Derive it from the client's real brand
   * palette when one exists; the ambient field, reveals, transitions and the
   * mascot's accent all take it on while the project is hovered or open.
   */
  pixelTheme: PixelTheme;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date
  readingTime: string;
  category: string;
  author: { name: string; role: string };
  /** Markdown-lite: paragraphs, headings prefixed with "## ", lists prefixed with "- " */
  body: string;
  published: boolean;
};

export type Role = {
  slug: string;
  title: string;
  type: "Internship" | "Full-time" | "Part-time" | "Contract";
  location: string;
  team: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  /** OWNER_VERIFY: compensation text shown verbatim. Leave empty to hide. */
  compensation: string;
  applyEmail?: string;
  published: boolean;
};

export type ProcessStage = {
  index: string;
  name: string;
  verb: string;
  summary: string;
  activities: string[];
  output: string;
};
