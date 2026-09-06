import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Tag({ children, className, tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "hot" | "cool" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-2 py-1 font-label text-[0.6875rem] uppercase tracking-[0.1em] leading-none",
        tone === "default" && "border-line-strong text-bone-200",
        tone === "hot" && "border-forge-500/40 bg-forge-500/10 text-forge-300",
        tone === "cool" && "border-pixel-400/40 bg-pixel-400/10 text-pixel-400",
        className,
      )}
    >
      {children}
    </span>
  );
}
