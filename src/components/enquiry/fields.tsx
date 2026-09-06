"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

const inputBase =
  "w-full rounded-md border bg-ink-850 px-4 py-3 text-bone-50 placeholder:text-bone-600 transition-colors duration-(--dur-fast) focus:outline-none focus:border-forge-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-400";

export function Field({ label, htmlFor, error, hint, optional, children }: { label: string; htmlFor: string; error?: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between text-small font-medium text-bone-50">
        <span>{label}</span>
        {optional && <span className="text-[0.75rem] font-normal text-bone-600">Optional</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-2 text-[0.8125rem] text-bone-600">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-2 text-[0.8125rem] text-forge-300">{error}</p>}
    </div>
  );
}

export function TextInput({ error, className, ...props }: ComponentProps<"input"> & { error?: string }) {
  return (
    <input
      {...props}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${props.id}-error` : props["aria-describedby"]}
      className={cn(inputBase, error ? "border-forge-500" : "border-line", className)}
    />
  );
}

export function TextArea({ error, className, ...props }: ComponentProps<"textarea"> & { error?: string }) {
  return (
    <textarea
      {...props}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${props.id}-error` : props["aria-describedby"]}
      className={cn(inputBase, "min-h-40 resize-y", error ? "border-forge-500" : "border-line", className)}
    />
  );
}

export function ChoiceGroup({
  legend, name, options, value, onChange, error, columns = 2,
}: {
  legend: string; name: string; options: readonly { value: string; label: string }[]; value: string; onChange: (v: string) => void; error?: string; columns?: 2 | 3;
}) {
  return (
    <fieldset aria-invalid={error ? true : undefined}>
      <legend className="mb-3 text-small font-medium text-bone-50">{legend}</legend>
      <div className={cn("grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3.5 text-small transition-colors duration-(--dur-fast) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forge-400",
                selected ? "border-forge-500 bg-forge-500/10 text-bone-50" : "border-line text-bone-200 hover:border-line-strong hover:text-bone-50",
              )}
            >
              <input type="radio" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} className="sr-only" />
              <span className={cn("h-2 w-2 shrink-0 transition-colors", selected ? "bg-forge-500" : "bg-line-strong")} aria-hidden="true" />
              {o.label}
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-[0.8125rem] text-forge-300">{error}</p>}
    </fieldset>
  );
}
