"use client";

import { useEffect } from "react";
import { authPip } from "./store";
import type { AuthPage } from "./logic";

/** Tells the gatekeeper which screen this is. Renders nothing. */
export function AuthPipPage({ page }: { page: AuthPage }) {
  // Immediately: the fields unlock at hydration, and a fast visitor must not have a focus event overwritten by a late greeting.
  useEffect(() => { authPip.load(page); }, [page]);
  return null;
}
