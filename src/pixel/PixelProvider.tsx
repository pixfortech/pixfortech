"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PixelEngine } from "./engine";
import { themeForPath } from "./theme-resolver";
import { forgeTheme } from "./themes";
import { behaviour } from "./behaviour/store";
import type { PixelTheme, RevealOptions } from "./types";

type PixelApi = {
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
const PixelContext = createContext<PixelApi>({
  theme: forgeTheme, preview: noop, registerReveal: () => noop, burst: noop, setFocal: noop, tier: "high", ready: false,
});

export function usePixel() {
  return useContext(PixelContext);
}

/**
 * Mounts the two shared canvases, owns the engine for the life of the app,
 * resolves the theme from the route, and turns internal link clicks into
 * forged route transitions.
 */
export function PixelProvider({ children }: { children: ReactNode }) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState<PixelApi["tier"]>("high");
  const routeTheme = useMemo(() => themeForPath(pathname), [pathname]);
  const [preview, setPreview] = useState<{ path: string; theme: PixelTheme } | null>(null);
  const theme = preview && preview.path === pathname ? preview.theme : routeTheme;

  // Engine lifecycle
  useEffect(() => {
    if (!bgRef.current || !fgRef.current) return;
    const engine = new PixelEngine(bgRef.current, fgRef.current);
    engineRef.current = engine;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __pixelEngine?: PixelEngine }).__pixelEngine = engine;
    engine.setTheme(themeForPath(window.location.pathname), true);
    setTier(engine.tier);
    setReady(true);
    return () => { engine.destroy(); engineRef.current = null; };
  }, []);

  // Route theme + transition completion
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setTheme(routeTheme);
    engine.routeChanged();
    const t = setTimeout(() => behaviour.setTransitioning(false), 450);
    return () => clearTimeout(t);
  }, [routeTheme]);

  // Internal link interception for forged transitions
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || engine.tier === "static") return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.getAttribute("rel")?.includes("external")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // hash links and same-page
      if (a.dataset.noTransition !== undefined) return;
      // Capture phase so this runs before Next's Link handler; stopping
      // propagation keeps Link from navigating a second time.
      e.preventDefault();
      e.stopPropagation();
      const href = url.pathname + url.search + url.hash;
      behaviour.setTransitioning(true);
      engine.startTransition(() => router.push(href), themeForPath(url.pathname));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  const api = useMemo<PixelApi>(() => ({
    theme,
    tier,
    ready,
    preview: (t) => {
      const path = window.location.pathname;
      setPreview(t ? { path, theme: t } : null);
      engineRef.current?.setTheme(t ?? themeForPath(path));
    },
    registerReveal: (el, opts) => engineRef.current?.registerReveal(el, opts) ?? noop,
    burst: (x, y, count, colour) => engineRef.current?.burst(x, y, count, colour),
    setFocal: (nx, ny) => engineRef.current?.setFocal(nx, ny),
  }), [theme, tier, ready]);


  return (
    <PixelContext.Provider value={api}>
      <canvas ref={bgRef} className="pixel-bg" aria-hidden="true" />
      {children}
      <canvas ref={fgRef} className="pixel-fg" aria-hidden="true" />
    </PixelContext.Provider>
  );
}
