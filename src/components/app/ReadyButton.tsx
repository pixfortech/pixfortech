"use client";

import type { ComponentProps } from "react";
import { useHydrated } from "@/lib/useHydrated";

/** Do not accept a click before React has attached its handler. */
export function ReadyButton({ disabled, ...props }: ComponentProps<"button">) {
  const hydrated = useHydrated();
  return <button {...props} disabled={disabled || !hydrated} />;
}
