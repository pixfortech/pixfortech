"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { copy } from "@content/microcopy";

/**
 * Keeps PiP's bench off the critical path: the section renders a same-size
 * placeholder, and the bench's code is fetched only once the section is
 * within a screen of the viewport. The scroll-forge reveal and the hero own
 * the first moments; the bench arrives when the visitor is nearly there.
 */
const PrecisionBench = dynamic(() => import("./PrecisionBench").then((m) => m.PrecisionBench), { ssr: false, loading: () => <Placeholder /> });

function Placeholder() {
  return <figure className="pf-bench pf-bench--auto" data-testid="pip-bench" data-mode="loading" data-running="false" aria-label={copy.home.benchCaption} role="img" />;
}

export function BenchLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setWanted(true); io.disconnect(); } }, { rootMargin: "50% 0px 50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="w-full">{wanted ? <PrecisionBench /> : <Placeholder />}</div>;
}
