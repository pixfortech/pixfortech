"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Arrow } from "@/components/ui/Button";
import { PROJECT_TYPES } from "@/lib/enquiry-schema";
import { cn } from "@/lib/utils";

/**
 * Compact project-start interaction: pick what you are building and jump into
 * the enquiry flow with that choice pre-selected.
 */
export function ProjectStarter() {
  const router = useRouter();
  const [type, setType] = useState<string>("");

  return (
    <form
      className="rounded-lg border border-line bg-ink-850/80 p-5 shadow-2 backdrop-blur-sm sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(type ? `/contact?type=${encodeURIComponent(type)}` : "/contact");
      }}
    >
      <fieldset>
        <legend className="eyebrow mb-4">What are you building?</legend>
        <div className="grid grid-cols-2 gap-2">
          {PROJECT_TYPES.map((t) => {
            const selected = type === t.value;
            return (
              <label
                key={t.value}
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3 text-small transition-colors duration-(--dur-fast) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forge-400",
                  selected ? "border-forge-500 bg-forge-500/10 text-bone-50" : "border-line text-bone-200 hover:border-line-strong hover:text-bone-50",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={selected}
                  onChange={() => setType(t.value)}
                  className="sr-only"
                />
                <span className={cn("h-2 w-2 shrink-0 transition-colors", selected ? "bg-forge-500" : "bg-line-strong")} aria-hidden="true" />
                {t.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <button
        type="submit"
        className="group mt-5 flex h-12 w-full items-center justify-between rounded-pill bg-bone-50 px-5 font-medium text-ink-950 transition-colors duration-(--dur-base) hover:bg-forge-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400"
      >
        <span>{type ? "Continue" : "Start a project"}</span>
        <Arrow />
      </button>
      <p className="mt-3 text-[0.8125rem] text-bone-600">Two minutes. No account, no sales call unless you ask for one.</p>
    </form>
  );
}
