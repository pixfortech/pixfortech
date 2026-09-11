import { PixelReveal } from "@/pixel/PixelReveal";
import type { RevealVariant } from "@/pixel/types";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  as?: "div" | "span" | "li";
  /** Materialisation variant; defaults to the horizontal forge wipe. */
  variant?: RevealVariant;
};

/**
 * Kept for API compatibility with the first build. Now backed by the pixel
 * engine's continuous reveal instead of a one-shot in-view animation.
 */
export function Reveal({ children, className, delay = 0, as = "div", variant }: Props) {
  return (
    <PixelReveal className={className} delay={delay} as={as} variant={variant}>
      {children}
    </PixelReveal>
  );
}
