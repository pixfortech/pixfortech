import type { Project } from "./types";
import type { PixelTheme } from "../src/pixel/types";

/**
 * Public projects. Only work the owner has approved for publication appears
 * here, described from what the sites do, not from invented results. Each
 * project carries its own pixel identity so the ambient field, reveals and
 * the mascot's ember take on its palette while it is hovered or open.
 */
const mithaiAndMaroon: PixelTheme = {
  primary: "#e9a23b", secondary: "#4a2320", accent: "#ffe0a8", background: "#c9782a",
  geometry: "dot", density: 0.55, behaviour: "cluster", speed: 0.8, size: 7,
  transitionStyle: "rise", mascotVariation: "warm", seed: 41,
};
const seamAndTurf: PixelTheme = {
  primary: "#e63946", secondary: "#1a2230", accent: "#f4f1ea", background: "#b22b37",
  geometry: "square", density: 0.5, behaviour: "lattice", speed: 1.2, size: 6,
  transitionStyle: "sweep", mascotVariation: "warm", seed: 53,
};

export const projects: Project[] = [
  {
    slug: "ganguram-sweets",
    title: "Ganguram Sweets",
    client: "Ganguram Sweets",
    industry: "Heritage confectionery, Kolkata",
    services: ["E-commerce", "Web Development", "Responsive Design"],
    technologies: [],
    tags: ["E-commerce", "Web Development", "Responsive Design"],
    headline: "1885 heritage. Considerably newer code.",
    outcome: "1885 heritage. Considerably newer code.",
    summary:
      "A digital commerce experience for one of Kolkata's heritage sweet brands, bringing Bengali mithai, gifting and online ordering into a modern storefront without sanding away the tradition.",
    overview: [
      "Ganguram is a name Kolkata has trusted since 1885. The brief was a storefront that carries that weight online: Bengali mithai and gifting presented properly, and an ordering journey that gets a customer from craving to checkout without a detour.",
      "We designed and built the storefront around the catalogue and the ordering flow, and kept it responsive from small phones up, because that is where most sweet cravings happen.",
    ],
    url: "https://ganguram.com/",
    cta: "See what we forged",
    pipLine: "They handled the sweets. I handled the pixels.",
    cover: { src: "/work/ganguram.svg", alt: "Abstract pixel composition in saffron, gold and maroon, the colours of Bengali mithai", width: 1600, height: 1200 },
    placeholder: false,
    published: true,
    featured: true,
    pixelTheme: mithaiAndMaroon,
  },
  {
    slug: "sd18-sports",
    title: "SD18 Sports",
    client: "SD18 Sports",
    industry: "Cricket gear and sportswear",
    services: ["E-commerce", "Web Design", "Development"],
    technologies: [],
    tags: ["E-commerce", "Web Design", "Development"],
    headline: "Built for people who take the crease seriously.",
    outcome: "Built for people who take the crease seriously.",
    summary:
      "An e-commerce experience for cricket gear, apparel and custom sportswear, designed to make finding the right kit considerably easier than facing a yorker.",
    overview: [
      "SD18 Sports sells cricket gear, apparel and custom sportswear to people who know exactly what they want and would like to find it quickly. The store had to make that easy on any screen.",
      "We designed and developed the storefront: product browsing built around the kit people actually search for, clear product pages, and a checkout that stays out of the way.",
    ],
    url: "https://sd18sports.com/",
    cta: "Inspect the build",
    pipLine: "I can optimise the website. Your cover drive is between you and your coach.",
    cover: { src: "/work/sd18.svg", alt: "Abstract pixel composition in red, ink and white, cut like a seam across a pitch", width: 1600, height: 1200 },
    placeholder: false,
    published: true,
    featured: true,
    pixelTheme: seamAndTurf,
  },
];
