"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Honors prefers-reduced-motion for every motion component: transforms and
 * layout animations are skipped, opacity fades are kept. Doing it here rather
 * than per component avoids server/client markup differences.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
