"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { behaviour } from "../behaviour/store";
import type { PipLine } from "../behaviour/messages";
import { usePixel } from "../context";
import { Bench, layoutFor, type SayKey } from "./bench";
import { drawFrame, type Palette } from "./draw";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

/**
 * PiP's bench: a contained character animation on a canvas. It initialises
 * when the section approaches the viewport, runs only while visible and the
 * tab is shown, and never touches React state per frame. Pointer and touch
 * input is read into the machine; a tap on PiP pokes him. Reduced motion
 * (or the engine's static tier) shows a finished composition with a blink.
 */
const subscribeMotion = (cb: () => void) => { const mq = window.matchMedia("(prefers-reduced-motion: reduce)"); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); };
const readMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribePage = (cb: () => void) => { document.addEventListener("visibilitychange", cb); return () => document.removeEventListener("visibilitychange", cb); };
const readPage = () => !document.hidden;

const BUBBLE_MS = 4200;

export function PrecisionBench({ className }: { className?: string }) {
  const { theme, tier, burst, ready } = usePixel();
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const pageVisible = useSyncExternalStore(subscribePage, readPage, () => true);
  const isStatic = reduced || tier === "static";
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const benchRef = useRef<Bench | null>(null);
  const bubbleTimer = useRef(0);
  const [mobile, setMobile] = useState(false);
  const [near, setNear] = useState(false);
  const [settled, setSettled] = useState(false);
  const [line, setLine] = useState<PipLine | null>(null);
  const palette = useMemo<Palette>(() => ({
    primary: theme.primary, accent: theme.accent, secondary: theme.secondary, bone: "#f4f1ea",
    ember: theme.mascotVariation === "cool" ? "#8b96ff" : theme.mascotVariation === "mono" ? "#f4f1ea" : theme.mascotVariation === "warm" ? theme.primary : "#ff5a2c",
  }), [theme]);

  const speak = useCallback((key: SayKey) => {
    const picked = behaviour.takeLine(key);
    if (!picked) return;
    setLine(picked);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setLine(null), BUBBLE_MS);
  }, []);

  // Layout: phones get their own arrangement, not a scaled-down desk.
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => { setMobile(entry.contentRect.width < 440); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wake once a meaningful part of the bench is on screen; sleep only when it has fully gone (hysteresis, so a
  // section edge hovering at the viewport boundary does not flap the animation on and off).
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setNear((prev) => (entry.intersectionRatio >= 0.15 ? true : entry.intersectionRatio <= 0 ? false : prev));
    }, { threshold: [0, 0.15] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Let the page settle first: the scroll-forge reveals and the hero own the first moments after load.
  useEffect(() => {
    if (!ready) return;
    const idle = (cb: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 2500 }) : window.setTimeout(cb, 1200));
    const cancel = (id: number) => (typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback(id) : clearTimeout(id));
    let inner = 0;
    const id = idle(() => { inner = window.setTimeout(() => setSettled(true), 900); });
    return () => { cancel(id); clearTimeout(inner); };
  }, [ready]);

  const running = near && settled && pageVisible && !isStatic;

  // One machine per layout. It survives pauses; only a layout change (portrait phone to tablet) rebuilds it.
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    const bench = new Bench(layoutFor(mobile));
    benchRef.current = bench;
    figure.dataset.phase = bench.phase; figure.dataset.object = bench.objectId; figure.dataset.cycles = "0";
    bench.events = {
      onPhase: (phase, id) => { figure.dataset.phase = phase; figure.dataset.object = id; },
      onPlaced: (_id, cycles) => { figure.dataset.cycles = String(cycles); figure.dataset.history = bench.history.join(","); },
      onSay: speak,
    };
    if (process.env.NODE_ENV !== "production") (window as unknown as { __pfBench?: Bench }).__pfBench = bench;
    return () => { if (benchRef.current === bench) benchRef.current = null; };
  }, [mobile, speak]);

  // Draw loop. Sizing happens here too so a resize while paused still repaints once.
  useEffect(() => {
    const canvas = canvasRef.current, figure = figureRef.current, bench = benchRef.current;
    if (!canvas || !figure || !bench) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const L = bench.layout;
    let cell = 10, raf = 0, last = 0, blink = false, blinkTimer = 0, blinkOff = 0;
    const size = () => {
      const rect = figure.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cell = rect.width / L.cols;
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.width * (L.rows / L.cols) * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = () => drawFrame(ctx, isStatic ? bench.staticFrame(blink) : bench.frame(), L.cols, L.rows, L.floorY, cell, palette);
    const ro = new ResizeObserver(() => { size(); paint(); });
    ro.observe(figure);
    size(); paint();
    figure.dataset.mode = isStatic ? "static" : mobile ? "mobile" : "live";
    figure.dataset.running = String(running);
    figure.dataset.gate = `${near ? "near" : "far"}/${settled ? "settled" : "settling"}/${pageVisible ? "shown" : "hidden"}`;
    if (isStatic) {
      // One very gentle change: a blink every few seconds.
      blinkTimer = window.setInterval(() => { blink = true; paint(); blinkOff = window.setTimeout(() => { blink = false; paint(); }, 180); }, 5200);
      return () => { ro.disconnect(); clearInterval(blinkTimer); clearTimeout(blinkOff); };
    }
    if (!running) return () => ro.disconnect();
    // Sixty frames a second only on capable devices; the eased motion reads just as well at thirty elsewhere.
    const minFrame = tier === "high" ? 0 : 30;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!last) { last = now; return; }
      const dt = now - last;
      if (dt < minFrame) return;
      last = now;
      bench.update(dt); paint();
    };
    raf = requestAnimationFrame(loop);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [running, isStatic, mobile, palette, tier, near, settled, pageVisible]);

  useEffect(() => () => clearTimeout(bubbleTimer.current), []);

  const toCell = (e: { clientX: number; clientY: number }) => {
    const bench = benchRef.current, figure = figureRef.current;
    if (!bench || !figure) return null;
    const r = figure.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * bench.layout.cols, y: ((e.clientY - r.top) / r.height) * bench.layout.rows };
  };
  const inPip = (c: { x: number; y: number }) => { const b = benchRef.current; if (!b) return false; const h = b.pipHome; return c.x >= h.x && c.x <= h.x + h.w + 2 && c.y >= h.y - 1 && c.y <= h.y + h.h; };
  const poke = (clientX?: number, clientY?: number) => {
    const bench = benchRef.current, figure = figureRef.current;
    if (!bench || !figure || isStatic) return;
    if (!bench.poke()) return;
    figure.dataset.pokes = String(Number(figure.dataset.pokes ?? 0) + 1);
    if (clientX !== undefined && clientY !== undefined) burst(clientX, clientY, 8);
  };

  const L = layoutFor(mobile);
  const home = { x: L.pipX, y: L.floorY - 11 * L.pipScale, w: 12 * L.pipScale, h: 12 * L.pipScale };
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const label = isStatic ? copy.home.benchCaptionStatic : copy.home.benchCaption;

  return (
    <figure ref={figureRef} className={cn("pf-bench", mobile && "pf-bench--mobile", className)} data-testid="pip-bench" aria-label={label} role="img">
      <canvas
        ref={canvasRef}
        className="pf-bench__canvas"
        aria-hidden="true"
        onPointerMove={(e) => { const c = toCell(e); benchRef.current?.setPointer(c); }}
        onPointerLeave={() => benchRef.current?.setPointer(null)}
        onPointerDown={(e) => { const c = toCell(e); if (c && inPip(c)) poke(e.clientX, e.clientY); }}
      />
      <button
        type="button"
        className="pf-bench__pip"
        style={{ left: pct(home.x, L.cols), top: pct(home.y, L.rows), width: pct(home.w + 1, L.cols), height: pct(home.h, L.rows) }}
        aria-label={copy.home.benchPoke}
        data-testid="bench-pip"
        onClick={(e) => { if (e.detail === 0) { const r = e.currentTarget.getBoundingClientRect(); poke(r.left + r.width / 2, r.top + r.height / 2); } }}
        onPointerDown={(e) => { e.preventDefault(); poke(e.clientX, e.clientY); }}
      />
      {line && (
        <div className="pf-bench__bubble" data-testid="bench-bubble" data-line={line.id} style={{ left: pct(home.x + 2 * L.pipScale, L.cols), bottom: pct(L.rows - home.y + 0.6, L.rows) }} role="presentation">
          <p>{line.text}</p>
        </div>
      )}
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
