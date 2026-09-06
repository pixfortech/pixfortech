/**
 * Pixel Forge pixel system: shared types.
 *
 * The whole site draws its ambient pixels, reveal blocks, transitions and
 * pointer trails through two canvases owned by one engine. Everything else
 * (mascot, counter, game) shares the same palette and physics vocabulary.
 */

export type Geometry = "square" | "dot" | "dash" | "diamond";

/** How the ambient field moves. Each behaviour computes a home position and drift. */
export type Behaviour =
  | "drift" // gentle convection, home page
  | "grid" // snaps toward a coarse lattice, work listing
  | "cluster" // gathers into small component-like blocks, services
  | "orbit" // slow circular paths around a few anchors, about
  | "order" // disorder resolving to a lattice as the page is scrolled, process
  | "lattice" // strict grid with occasional hops, technologies
  | "lines" // dash particles arranged in text-like rows, insights
  | "energetic" // fast exploratory motion, careers
  | "converge" // slow pull toward a focal point, contact
  | "escape" // wandering outward, 404
  | "minimal"; // sparse, almost still, legal pages

export type RevealStyle = "sweep" | "scatter" | "rise" | "grid" | "edge";

export type PixelTheme = {
  /** Hex colours. First is dominant. */
  primary: string;
  secondary: string;
  accent: string;
  /** Tint applied as a very faint radial wash behind content. */
  background: string;
  geometry: Geometry;
  /** 0..1 relative density; the engine scales by device tier. */
  density: number;
  behaviour: Behaviour;
  /** Base speed multiplier. */
  speed: number;
  /** Nominal cell size in CSS px. */
  size: number;
  transitionStyle: RevealStyle;
  /** Mascot accent variation: which colour the mascot's hot pixel takes. */
  mascotVariation: "forge" | "cool" | "warm" | "mono";
  seed: number;
};

export type QualityTier = "high" | "medium" | "low" | "static";

export type RevealState = "hidden" | "assembling" | "revealed" | "deconstructing";

export type RevealOptions = {
  style: RevealStyle;
  /** Larger blocks read as construction; smaller as texture. CSS px. */
  cell?: number;
  /** Duration in ms for assemble/deconstruct. */
  duration?: number;
};
