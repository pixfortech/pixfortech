/**
 * "Pixels forged" estimate. Playful, but derived from the visitor's real
 * screen: CSS size × devicePixelRatio for physical pixels, page height for
 * the full surface, and the furthest scroll position for how much of it has
 * been "forged" so far.
 */
export type CounterInput = {
  viewportWidth: number;
  viewportHeight: number;
  pageHeight: number;
  devicePixelRatio: number;
  /** 0..1 furthest scroll progress on this page. */
  maxScrollProgress: number;
};

export function estimatePagePixels(i: CounterInput): number {
  const dpr = Math.max(1, Math.min(4, i.devicePixelRatio || 1));
  const physW = i.viewportWidth * dpr;
  const physH = Math.max(i.pageHeight, i.viewportHeight) * dpr;
  return Math.round(physW * physH);
}

export function pixelsForged(i: CounterInput): number {
  const total = estimatePagePixels(i);
  // At least one viewport is forged the moment the page renders.
  const minFraction = Math.min(1, (i.viewportHeight * Math.max(1, i.devicePixelRatio)) / Math.max(1, i.pageHeight * Math.max(1, i.devicePixelRatio)));
  const fraction = Math.max(minFraction, Math.min(1, i.maxScrollProgress));
  return Math.round(total * fraction);
}

/** 843K, 12.8M, 147.2M */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  if (n < 100_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatExact(n: number): string {
  return n.toLocaleString("en-GB");
}

/** Scroll progress from a document's metrics; 1 when the page fits the viewport. */
export function scrollProgress(scrollY: number, viewportHeight: number, pageHeight: number): number {
  const max = pageHeight - viewportHeight;
  if (max <= 0) return 1;
  return Math.max(0, Math.min(1, scrollY / max));
}
