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

/** Reveals a heading line by line using a clip mask. */
export function LineReveal({ lines, className, delay = 0 }: { lines: string[]; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.09, opacity: { duration: 0.3, delay: delay + i * 0.09 } }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
