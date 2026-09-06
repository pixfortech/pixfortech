"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Accessible dialog: focus moves in, Escape closes, focus returns. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="pf-modal-title" className={`max-h-[92svh] w-full overflow-y-auto rounded-t-lg border border-line bg-ink-850 p-5 shadow-2 sm:rounded-lg sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
        <div className="mb-4 flex items-center justify-between"><h2 id="pf-modal-title" className="text-[1rem] font-semibold">{title}</h2><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-bone-400 hover:bg-bone-50/5 hover:text-bone-50" aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}
