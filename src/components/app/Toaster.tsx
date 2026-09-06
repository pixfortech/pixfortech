"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type Toast = { id: string; title: string; body?: string; href?: string; kind?: string; sticky?: boolean };

const icons: Record<string, string> = { message: "M", mention: "@", request: "R", task: "T", approval: "A", milestone: "◆", file: "F", project: "P", due: "!", info: "•", success: "✓", error: "×" };

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (t.sticky) return;
    const id = setTimeout(() => onDismiss(t.id), 7000);
    return () => clearTimeout(id);
  }, [t, onDismiss]);
  return (
    <div className={cn("pf-toast pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-line bg-ink-850 p-3 shadow-2", t.kind === "error" && "border-[#ff6b6b]/50")} role="status">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-forge-500/15 text-[0.75rem] font-semibold text-forge-300" aria-hidden="true">{icons[t.kind ?? "info"] ?? "•"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-semibold text-bone-50">{t.title}</p>
        {t.body && <p className="mt-0.5 line-clamp-2 text-[0.8125rem] text-bone-400">{t.body}</p>}
        {t.href && <Link href={t.href} onClick={() => onDismiss(t.id)} className="mt-1.5 inline-block text-[0.8125rem] font-medium text-forge-300 hover:text-forge-400">View →</Link>}
      </div>
      <button type="button" onClick={() => onDismiss(t.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-sm text-bone-400 hover:bg-bone-50/5 hover:text-bone-50" aria-label="Dismiss notification">×</button>
    </div>
  );
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex flex-col gap-2 sm:right-5 sm:top-5" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => <ToastItem key={t.id} t={t} onDismiss={onDismiss} />)}
    </div>
  );
}
