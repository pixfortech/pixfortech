import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CSS-only entrance animations for above-the-fold content.
 * No JavaScript dependency, so text paints at first render and
 * Largest Contentful Paint is not delayed by hydration.
 */

/** Reveals heading lines with a clip mask. */
export function LineReveal({ lines, className, delay = 0 }: { lines: string[]; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <span className="block anim-rise" style={{ animationDelay: `${delay + i * 0.09}s` }}>
            {line}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Fades and lifts a block into place. */
export function Rise({ children, className, delay = 0, as: Tag = "div", style }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "p" | "span"; style?: CSSProperties }) {
  return (
    <Tag className={cn("anim-fade-up", className)} style={{ animationDelay: `${delay}s`, ...style }}>
      {children}
    </Tag>
  );
}
