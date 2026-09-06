"use client";

import { useEffect, useRef, useState } from "react";
import { useBehaviour } from "./behaviour/store";
import { formatCompact, formatExact, pixelsForged } from "./counter";
import { cn } from "@/lib/utils";

function useForgedPixels() {
  const { maxScroll, route } = useBehaviour();
  const [value, setValue] = useState(0);
  const [metrics, setMetrics] = useState({ vw: 0, vh: 0, ph: 0, dpr: 1 });
  const shown = useRef(0);

  useEffect(() => {
    const read = () => setMetrics({ vw: window.innerWidth, vh: window.innerHeight, ph: document.documentElement.scrollHeight, dpr: window.devicePixelRatio || 1 });
    read();
    const t = setTimeout(read, 600); // after fonts/images settle
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => { clearTimeout(t); window.removeEventListener("resize", read); window.removeEventListener("orientationchange", read); };
  }, [route]);

  const target = metrics.vw ? pixelsForged({ viewportWidth: metrics.vw, viewportHeight: metrics.vh, pageHeight: metrics.ph, devicePixelRatio: metrics.dpr, maxScrollProgress: maxScroll }) : 0;

  // Smooth tween toward the target so the number never jumps.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const diff = target - shown.current;
      // First value lands immediately; later increments ease over a few frames.
      if (shown.current === 0 || Math.abs(diff) < 1000) { shown.current = target; setValue(target); return; }
      shown.current += diff * 0.25;
      setValue(Math.round(shown.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return { value, complete: maxScroll >= 0.985, target };
}

/** Compact persistent indicator, desktop only. */
export function PixelCounterPill() {
  const { value, complete } = useForgedPixels();
  if (!value) return null;
  const title = `${formatExact(value)} pixels forged on this page so far. Estimated from your screen size, pixel density, page height and how far you have scrolled.`;
  return (
    <div className="pf-counter" data-complete={complete} title={title} aria-label={title} role="img" data-testid="pixel-counter">
      <span className="pf-counter__cell" aria-hidden="true" />
      <span className="pf-counter__num">≈{formatCompact(value)}</span>
      <span>px forged</span>
    </div>
  );
}

/** Footer line with the exact figure, all devices. */
export function PixelCounterLine({ className }: { className?: string }) {
  const { value, complete } = useForgedPixels();
  return (
    <p className={cn("num", className)} data-testid="pixel-counter-line">
      {value ? (
        <>
          <span className="text-bone-50">{formatExact(value)}</span> pixels forged on this page{complete ? ". That's the lot." : " so far."}
          <span className="block text-[0.75rem] text-bone-600 mt-1">Estimated from your screen, its pixel density, the page height and how far you scrolled.</span>
        </>
      ) : (
        "Counting pixels…"
      )}
    </p>
  );
}
