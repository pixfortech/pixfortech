import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------
   Product UI primitives. Restrained, dense, Space Grotesk, one accent.
------------------------------------------------------------------- */

export function Card({ children, className, as: Tag = "section", id }: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; id?: string }) {
  return <Tag id={id} className={cn("rounded-lg border border-line bg-ink-850/70", className)}>{children}</Tag>;
}

export function CardHeader({ title, action, description, className }: { title: ReactNode; action?: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div>
        <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-bone-50">{title}</h2>
        {description && <p className="mt-0.5 text-[0.8125rem] text-bone-400">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, hint, tone = "default", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "hot" | "warn" | "good"; href?: string }) {
  const body = (
    <div className={cn("flex h-full flex-col justify-between rounded-lg border border-line bg-ink-850/70 px-4 py-4 transition-colors", href && "hover:border-line-strong hover:bg-ink-850")}>
      <p className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-bone-400">{label}</p>
      <p className={cn("num mt-3 text-[1.75rem] font-semibold leading-none", tone === "hot" && "text-forge-400", tone === "warn" && "text-[#f0b35a]", tone === "good" && "text-[#7ed0a2]")}>{value}</p>
      {hint && <p className="mt-2 text-[0.75rem] text-bone-600">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-400">{body}</Link> : body;
}

const badgeTones: Record<string, string> = {
  neutral: "border-line-strong text-bone-200",
  hot: "border-forge-500/50 bg-forge-500/10 text-forge-300",
  cool: "border-pixel-400/40 bg-pixel-400/10 text-pixel-400",
  good: "border-[#7ed0a2]/40 bg-[#7ed0a2]/10 text-[#9fe0bb]",
  warn: "border-[#f0b35a]/40 bg-[#f0b35a]/10 text-[#f5c98a]",
  bad: "border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ff9b9b]",
  muted: "border-line text-bone-400",
  internal: "border-[#f0b35a] bg-[#f0b35a] text-ink-950",
};
export function Badge({ children, tone = "neutral", className, dot }: { children: ReactNode; tone?: keyof typeof badgeTones; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border px-1.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.06em] leading-none", badgeTones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export const statusTone = (status: string): keyof typeof badgeTones => {
  if (["completed", "done", "approved", "closed"].includes(status)) return "good";
  if (["blocked", "delayed", "rejected", "changes_requested", "overdue", "on_hold", "cancelled"].includes(status)) return "bad";
  if (["client_review", "ready_for_review", "awaiting_approval", "needs_clarification", "at_risk", "in_review", "pending"].includes(status)) return "warn";
  if (["in_progress", "development", "design", "scheduled", "approved"].includes(status)) return "hot";
  if (["lead", "backlog", "submitted"].includes(status)) return "muted";
  return "neutral";
};

export const priorityTone = (p: string): keyof typeof badgeTones => (p === "urgent" ? "bad" : p === "high" ? "hot" : p === "low" ? "muted" : "neutral");

export function humanise(s: string): string {
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function Avatar({ name, image, size = 28, className }: { name: string; image?: string | null; size?: number; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" width={size} height={size} className={cn("shrink-0 rounded-sm object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-sm font-semibold text-ink-950", className)} style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4), background: `oklch(0.8 0.08 ${hue})` }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Progress({ value, className, tone = "hot", label }: { value: number; className?: string; tone?: "hot" | "good" | "cool"; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-ink-700" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
        <div className={cn("h-full rounded-pill", tone === "hot" ? "bg-forge-500" : tone === "good" ? "bg-[#7ed0a2]" : "bg-pixel-400")} style={{ width: `${v}%` }} />
      </div>
      <span className="num w-9 text-right text-[0.75rem] text-bone-400">{v}%</span>
    </div>
  );
}

/** Restrained pixel identity for a project: a 3x3 of cells in its theme. */
export function ProjectMark({ theme, size = 20, className }: { theme?: string | null; size?: number; className?: string }) {
  let primary = "#ff5a2c", secondary = "#3a3a44", accent = "#ffb08a";
  try { if (theme) { const t = JSON.parse(theme); primary = t.primary ?? primary; secondary = t.secondary ?? secondary; accent = t.accent ?? accent; } } catch { /* default */ }
  const cells = [secondary, primary, secondary, primary, accent, primary, secondary, primary, secondary];
  const u = size / 3;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={cn("shrink-0", className)}>
      {cells.map((c, i) => <rect key={i} x={(i % 3) * u + 0.5} y={Math.floor(i / 3) * u + 0.5} width={u - 1} height={u - 1} rx={1} fill={c} />)}
    </svg>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <div className="mb-4 grid grid-cols-3 gap-0.5" aria-hidden="true">
        {icon ?? [0.2, 0.5, 0.2, 0.5, 1, 0.5, 0.2, 0.5, 0.2].map((o, i) => <span key={i} className="h-2 w-2 bg-forge-500" style={{ opacity: o }} />)}
      </div>
      <p className="font-semibold text-bone-50">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[0.875rem] text-bone-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageTitle({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[0.75rem] font-medium uppercase tracking-[0.1em] text-bone-400">{eyebrow}</p>}
        <h1 className="truncate font-display text-[1.5rem] font-semibold tracking-[-0.02em] text-bone-50 sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[0.875rem] text-bone-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AppButton({ children, variant = "primary", size = "md", className, href, ...rest }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md"; className?: string; href?: string } & Omit<ComponentProps<"button">, "className" | "children">) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forge-400 disabled:opacity-50 disabled:pointer-events-none",
    size === "sm" ? "h-8 px-3 text-[0.8125rem]" : "h-10 px-4 text-[0.875rem]",
    variant === "primary" && "bg-bone-50 text-ink-950 hover:bg-forge-500",
    variant === "secondary" && "border border-line-strong text-bone-50 hover:border-bone-50 hover:bg-bone-50/5",
    variant === "ghost" && "text-bone-200 hover:bg-bone-50/5 hover:text-bone-50",
    variant === "danger" && "border border-[#ff6b6b]/50 text-[#ff9b9b] hover:bg-[#ff6b6b]/10",
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function Field({ label, htmlFor, error, hint, children, optional }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-[0.8125rem] font-medium text-bone-50">
        <span>{label}</span>{optional && <span className="text-[0.6875rem] font-normal text-bone-600">Optional</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[0.75rem] text-bone-600">{hint}</p>}
      {error && <p className="mt-1 text-[0.75rem] text-forge-300" role="alert">{error}</p>}
    </div>
  );
}

export const inputCls = "w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-[0.875rem] text-bone-50 placeholder:text-bone-600 focus:border-forge-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forge-400 disabled:opacity-60";
export const selectCls = inputCls + " appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%239a968d' stroke-width='1.5'/></svg>\")] bg-[length:12px] bg-[position:right_0.75rem_center] bg-no-repeat pr-8";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-line", className)}>
      <table className="w-full min-w-[40rem] border-collapse text-[0.875rem]">{children}</table>
    </div>
  );
}
export const th = "px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-bone-400 border-b border-line bg-ink-850/80";
export const td = "px-4 py-3 align-middle border-b border-line-faint text-bone-200";

export function timeAgo(d: Date | number | null | undefined): string {
  if (!d) return "";
  const t = typeof d === "number" ? d : d.getTime();
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
export function fmtDate(d: Date | number | null | undefined, withYear = false): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}
export function dueTone(d: Date | null | undefined, done = false): "muted" | "warn" | "bad" | "neutral" {
  if (!d || done) return "muted";
  const diff = d.getTime() - Date.now();
  if (diff < 0) return "bad";
  if (diff < 2 * 86400000) return "warn";
  return "neutral";
}
