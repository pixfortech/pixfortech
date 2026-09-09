"use client";

import { useEffect, useRef } from "react";
import { buildCubes, drawScene, hitCube, isActive, type Interaction } from "./forge-scene";

type Props = {
  className?: string;
  /** Anchor of the structure as fractions of canvas size, per breakpoint. */
  anchor?: { desktop: [number, number]; mobile: [number, number] };
};

/** Tells the rest of the page (PiP, mainly) what happened in the scene. */
function announce(kind: "tap" | "drag" | "secret" | "hover", detail: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent("pf:hero", { detail: { kind, ...detail } }));
}

/**
 * Canvas host for the Pixel Forge hero scene.
 * - Sizes to its container with a capped device-pixel ratio.
 * - Pauses when off-screen or the tab is hidden, and stops drawing when calm.
 * - Simplifies on small or low-power devices.
 * - Pointer, touch and keyboard drive the interaction; reduced motion keeps a
 *   static assembled frame that only warms where it is tapped.
 */
export function ForgeCanvas({ className, anchor = { desktop: [0.745, 0.5], mobile: [0.5, 0.5] } }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || (typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" && (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4);

    let width = 0, height = 0, dpr = 1;
    let size = 11;
    let cubes = buildCubes(size);
    const pointer: Interaction = { x: 0, y: 0, active: false, speed: 0, dragging: false, pulses: [], scatter: 0, wave: 0 };
    let scroll = 0;
    let raf = 0;
    let visible = true;
    let start = performance.now();
    let last = start;
    let mobile = false;
    let lastActivity = start;
    let unit = 12;
    let anchorX = 0, anchorY = 0;
    // Gesture bookkeeping
    let downAt = 0, downX = 0, downY = 0, moved = false, pointerId = -1;
    let lastMoveT = 0, lastMoveX = 0, lastMoveY = 0;
    let taps: number[] = [];
    let secretFound = { ember: false, wave: false, scatter: false };
    let hoverAnnounced = false;

    const layout = () => {
      const [ax, ay] = mobile ? anchor.mobile : anchor.desktop;
      const spanUnits = size * 1.0 + 5;
      unit = Math.max(9, Math.min(width / (size * 2.4), (height * (mobile ? 0.72 : 0.66)) / spanUnits));
      anchorX = width * ax;
      anchorY = height * ay - unit * (size * 0.5) + unit * 2;
    };

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
      if (nextSize !== size) { size = nextSize; cubes = buildCubes(size); }
      layout();
      if (reducedMotion) frame(performance.now());
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const idle = t > 4.5 && now - lastActivity > 900 && !isActive(cubes, pointer);
      if (idle && !reducedMotion) { raf = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // pointer speed decays when no new movement arrives
      pointer.speed *= 0.9;
      drawScene(ctx, cubes, { t, dt, width, height, anchorX, anchorY, unit, pointer, scroll }, { size, reducedMotion });
      if (!reducedMotion && visible) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

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
      scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * 0.9)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const local = (e: PointerEvent): [number, number] => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const pulse = (x: number, y: number, strength: number) => { if (pointer.pulses.length < 4) pointer.pulses.push({ x, y, t: 0, strength }); wake(); };

    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e);
      const now = performance.now();
      if (lastMoveT) {
        const v = Math.hypot(x - lastMoveX, y - lastMoveY) / Math.max(1, now - lastMoveT) * 1000;
        pointer.speed = pointer.speed * 0.6 + v * 0.4;
      }
      lastMoveT = now; lastMoveX = x; lastMoveY = y;
      if (e.pointerType === "touch" && pointerId !== e.pointerId) return; // a touch only interacts while pressed
      pointer.x = x; pointer.y = y; pointer.active = true;
      if (pointerId === e.pointerId && !moved && Math.hypot(x - downX, y - downY) > 12) { moved = true; pointer.dragging = true; announce("drag"); }
      if (!hoverAnnounced && e.pointerType !== "touch" && hitCube(cubes, x, y, { anchorX, anchorY, unit })) { hoverAnnounced = true; announce("hover"); }
      wake();
    };
    const onLeave = () => { pointer.active = false; pointer.dragging = false; wake(); };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const [x, y] = local(e);
      pointerId = e.pointerId; downAt = performance.now(); downX = x; downY = y; moved = false;
      pointer.x = x; pointer.y = y; pointer.active = true;
      wake();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const [x, y] = local(e);
      const wasDrag = moved;
      pointerId = -1; pointer.dragging = false;
      if (e.pointerType === "touch") pointer.active = false;
      if (wasDrag) return; // release: cubes spring home on their own
      if (performance.now() - downAt > 600) return;
      // A tap. Secrets first: the ember cube, then rhythm.
      const hit = hitCube(cubes, x, y, { anchorX, anchorY, unit });
      const now = performance.now();
      taps = taps.filter((tt) => now - tt < 700); taps.push(now);
      if (hit?.ember) {
        pointer.scatter = 1; secretFound.ember = true;
        pulse(x, y, 1.4); announce("secret", { which: "ember" });
        return;
      }
      if (taps.length >= 3) {
        taps = []; pointer.wave = 0.01; secretFound.wave = true;
        announce("secret", { which: "wave" });
        return;
      }
      if (hit && hit.gz === 0 && (hit.gx === 0 || hit.gy === 0) && !secretFound.scatter) {
        // The base rim: one row lifts and settles, a quieter secret than the ember.
        pointer.wave = 0.01; secretFound.scatter = true;
        announce("secret", { which: "rim" });
        return;
      }
      pulse(x, y, hit ? 1 : 0.6);
      announce("tap", { cube: Boolean(hit) });
    };
    const onCancel = () => { pointerId = -1; pointer.dragging = false; pointer.active = false; wake(); };

    const host = canvas.parentElement ?? canvas;
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onCancel);

    // Keyboard: arrows move the heat point, Enter or Space sends a pulse from it.
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(e.key)) return;
      e.preventDefault();
      if (!pointer.active) { pointer.x = anchorX; pointer.y = anchorY + unit * size * 0.5; pointer.active = true; }
      const step = unit * 1.5;
      if (e.key === "ArrowLeft") pointer.x -= step;
      if (e.key === "ArrowRight") pointer.x += step;
      if (e.key === "ArrowUp") pointer.y -= step;
      if (e.key === "ArrowDown") pointer.y += step;
      if (e.key === "Enter" || e.key === " ") { pulse(pointer.x, pointer.y, 1); announce("tap", { keyboard: true }); }
      wake();
    };
    host.addEventListener("keydown", onKey);
    const onBlur = () => { pointer.active = false; wake(); };
    host.addEventListener("blur", onBlur);

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
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      host.removeEventListener("keydown", onKey);
      host.removeEventListener("blur", onBlur);
      secretFound = { ember: false, wave: false, scatter: false };
    };
  }, [anchor]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
