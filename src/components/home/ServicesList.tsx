"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Arrow } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/utils";

export type ServiceItem = {
  slug: string;
  index: string;
  title: string;
  summary: string;
  headline?: string;
  cta?: string;
  problem: string;
  capability: string;
  outcome: string;
  technologies: string[];
};

/**
 * Accessible accordion of services. One open at a time; headers are real
 * buttons, panels are keyboard reachable, and each row links to its page.
 */
export function ServicesList({ services }: { services: ServiceItem[] }) {
  const [open, setOpen] = useState<string>(services[0]?.slug ?? "");
  const base = useId();
  const reduce = useReducedMotion();

  return (
    <div className="border-t border-line">
      {services.map((s) => {
        const isOpen = open === s.slug;
        const panelId = `${base}-${s.slug}-panel`;
        const btnId = `${base}-${s.slug}-btn`;
        return (
          <div key={s.slug} className="border-b border-line">
            <h3 className="m-0">
              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? "" : s.slug)}
                className={cn(
                  "group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 text-left transition-colors duration-(--dur-fast) sm:grid-cols-[4rem_1fr_auto] sm:py-8",
                  isOpen ? "text-bone-50" : "text-bone-200 hover:text-bone-50",
                )}
              >
                <span className={cn("num text-small transition-colors", isOpen ? "text-forge-400" : "text-bone-600 group-hover:text-forge-400")}>{s.index}</span>
                <span className="min-w-0">
                  <span className="block font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]">{s.title}</span>
                  {s.headline && <span className={cn("mt-2 block text-[0.9375rem] leading-snug transition-colors", isOpen ? "text-bone-300" : "text-bone-500 group-hover:text-bone-300")}>{s.headline}</span>}
                </span>
                <span
                  aria-hidden="true"
                  className={cn("relative block h-6 w-6 text-bone-400 transition-transform duration-(--dur-base) ease-(--ease-out)", isOpen && "rotate-45 text-forge-400")}
                >
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
                  <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-8 pb-8 sm:pl-[4rem] pl-[2.5rem] lg:grid-cols-12 lg:gap-10 lg:pb-10">
                    <p className="max-w-prose text-bone-200 lg:col-span-12">{s.summary}</p>
                    <div className="grid gap-6 sm:grid-cols-3 lg:col-span-9">
                      <div>
                        <p className="eyebrow mb-2">Problem</p>
                        <p className="text-small text-bone-200">{s.problem}</p>
                      </div>
                      <div>
                        <p className="eyebrow mb-2">Capability</p>
                        <p className="text-small text-bone-200">{s.capability}</p>
                      </div>
                      <div>
                        <p className="eyebrow mb-2">Outcome</p>
                        <p className="text-small text-bone-200">{s.outcome}</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between gap-6 lg:col-span-3">
                      <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
                        {s.technologies.map((t) => (
                          <li key={t}><Tag>{t}</Tag></li>
                        ))}
                      </ul>
                      <Link href={`/services/${s.slug}`} className="group/link inline-flex items-center gap-2 font-medium text-bone-50 hover:text-forge-300 w-fit">
                        <span className="link-line">{s.cta ?? "About this service"}</span>
                        <Arrow className="group-hover/link:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
