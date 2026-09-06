"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  as?: "div" | "span" | "li";
};

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Enters when scrolled into view. Under prefers-reduced-motion the root
 * MotionConfig removes the transform and keeps only the short fade.
 * Content is always in the DOM so it is indexable.
 */
export function Reveal({ children, className, delay = 0, y = 24, once = true, as = "div" }: Props) {
  const Tag = as === "span" ? motion.span : as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, ease, delay }}
    >
      {children}
    </Tag>
  );
}
