import type { ReactNode } from "react";

export function AuthCard({ title, lead, children, footer }: { title: string; lead?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="w-full max-w-[26rem]">
      <div className="rounded-lg border border-line bg-ink-850/80 p-6 shadow-2 sm:p-8">
        <h1 className="font-display text-[1.5rem] font-semibold tracking-[-0.02em] text-bone-50">{title}</h1>
        {lead && <p className="mt-2 text-[0.875rem] text-bone-400">{lead}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-[0.8125rem] text-bone-400">{footer}</div>}
    </div>
  );
}
