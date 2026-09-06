"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { usePixel } from "./PixelProvider";
import type { RevealStyle } from "./types";

type Props = {
  children: ReactNode;
  className?: string;
  /** Stagger for the content transition, seconds. */
  delay?: number;
  as?: "div" | "span" | "li" | "section" | "article";
  /** Construction style; defaults to the current theme's transition style. */
  style?: RevealStyle;
  /** Block size in CSS px. */
  cell?: number;
  id?: string;
};

/**
 * Scroll-forged reveal. The element is assembled left to right as its top
 * edge travels through the forge band at the bottom of the viewport, driven
 * purely by scroll position: stop scrolling and it freezes, scroll back and
 * it unforges. Content is always in the DOM and visible without JavaScript.
 */
export function PixelReveal({ children, className, delay = 0, as = "div", style, cell, id }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const { registerReveal, theme, ready } = usePixel();
  const themeStyle = theme.transitionStyle;

  useEffect(() => {
    if (!ready || !ref.current) return;
    return registerReveal(ref.current, { style: style ?? themeStyle, cell });
    // Re-register when style changes; the engine handles the initial in-view state.
  }, [registerReveal, ready, style, themeStyle, cell]);

  const Tag = as;
  const css: CSSProperties | undefined = delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined;
  return (
    <Tag ref={(el: HTMLElement | null) => { ref.current = el; }} id={id} className={className} data-forge="forged" style={css}>
      {children}
    </Tag>
  );
}
