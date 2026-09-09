"use client";

import { createContext, useContext } from "react";
import { forgeTheme } from "./themes";
import type { PixelTheme, RevealOptions } from "./types";

/**
 * The pixel context on its own, without the engine. Product surfaces (the
 * mascot, games, scenes) read the theme and helpers from here; only the
 * public site mounts the provider that pulls in the canvas engine.
 */
export type PixelApi = {
  /** Current theme (route or project). */
  theme: PixelTheme;
  /** Temporarily preview a theme, e.g. hovering a project card. Pass null to restore. */
  preview: (theme: PixelTheme | null) => void;
  registerReveal: (el: HTMLElement, opts: RevealOptions) => () => void;
  burst: (x: number, y: number, count?: number, colour?: string) => void;
  setFocal: (nx: number, ny: number) => void;
  tier: "high" | "medium" | "low" | "static";
  ready: boolean;
};

const noop = () => undefined;
export const PixelContext = createContext<PixelApi>({
  theme: forgeTheme, preview: noop, registerReveal: () => noop, burst: noop, setFocal: noop, tier: "high", ready: false,
});

export function usePixel() {
  return useContext(PixelContext);
}
