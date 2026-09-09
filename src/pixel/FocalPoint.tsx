"use client";

import { useEffect, useRef } from "react";
import { usePixel } from "./context";

/** Marks where the "converge" behaviour should lean toward, e.g. the enquiry form. */
export function FocalPoint() {
  const ref = useRef<HTMLSpanElement>(null);
  const { setFocal, ready } = usePixel();
  useEffect(() => {
    if (!ready || !ref.current) return;
    const update = () => {
      const r = ref.current!.getBoundingClientRect();
      setFocal(Math.min(1, Math.max(0, (r.left + 200) / window.innerWidth)), Math.min(1, Math.max(0, (r.top + 240) / window.innerHeight)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [ready, setFocal]);
  return <span ref={ref} aria-hidden="true" />;
}
