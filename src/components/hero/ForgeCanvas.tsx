"use client";

import { useEffect, useRef } from "react";
import { buildCubes, drawScene } from "./forge-scene";

type Props = {
  className?: string;
  /** Anchor of the structure as fractions of canvas size, per breakpoint. */
  anchor?: { desktop: [number, number]; mobile: [number, number] };
};

/**
 * Canvas host for the Pixel Forge hero scene.
 * - Sizes to its container with a capped device-pixel ratio.
 * - Pauses when off-screen or the tab is hidden.
 * - Simplifies on small or low-power devices.
 * - Renders a static assembled frame when reduced motion is requested.
 */
export function ForgeCanvas({ className, anchor = { desktop: [0.745, 0.5], mobile: [0.5, 0.5] } }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || (typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" && (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4);

    let width = 0, height = 0, dpr = 1;
    let size = 11;
    let cubes = buildCubes(size);
    const pointer = { x: 0, y: 0, active: false };
    let scroll = 0;
    let raf = 0;
    let visible = true;
    let start = performance.now();
    let last = start;
    let mobile = false;
    let lastActivity = start;
    let frameCount = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobile = width < 1024;
      const nextSize = mobile || lowPower ? 9 : 11;
      if (nextSize !== size) {
        size = nextSize;
        cubes = buildCubes(size);
      }
      if (reducedMotion) frame(performance.now());
    };

    const frame = (now: number) => {
      frameCount++;
      const t = (now - start) / 1000;
      // Once assembled and untouched, stop drawing entirely. Pointer movement
      // or scrolling wakes the loop again; the last frame stays on screen.
      const idle = t > 4.5 && now - lastActivity > 900 && !hasHeat();
      if (idle && !reducedMotion) { raf = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const [ax, ay] = mobile ? anchor.mobile : anchor.desktop;
      // Unit chosen so the structure spans roughly 60% of the available height
      const spanUnits = size * 1.0 + 5;
      const unit = Math.max(9, Math.min(width / (size * 2.4), (height * (mobile ? 0.72 : 0.66)) / spanUnits));
      drawScene(ctx, cubes, {
        t, dt, width, height,
        anchorX: width * ax,
        anchorY: height * ay - unit * (size * 0.5) + unit * 2,
        unit,
        pointer,
        scroll,
      }, { size, reducedMotion });
      if (!reducedMotion && visible) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

    const hasHeat = () => { for (let i = 0; i < cubes.length; i += 7) if (cubes[i].heat > 0.01) return true; return false; };
    const play = () => {
      if (reducedMotion) { frame(performance.now()); return; }
      if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    const wake = () => { lastActivity = performance.now(); play(); };
    const pause = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      if (visible) play(); else pause();
    }, { threshold: 0.02 });
    io.observe(canvas);

    const onVis = () => { visible = !document.hidden; if (visible) play(); else pause(); };
    document.addEventListener("visibilitychange", onVis);

    const onScroll = () => {
      wake();
      const rect = canvas.getBoundingClientRect();
      // 0 while the hero top is in view; 1 once we've scrolled a full hero height
      scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * 0.9)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onMove = (e: PointerEvent) => {
      if (coarse) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      wake();
    };
    const onLeave = () => { pointer.active = false; wake(); };
    const host = canvas.parentElement ?? canvas;
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    start = performance.now();
    play();

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [anchor]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
