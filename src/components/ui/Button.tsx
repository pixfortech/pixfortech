"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMagnetic } from "./useMagnetic";
import type { ReactNode, ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "group relative inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-pill font-medium transition-[background-color,color,border-color,box-shadow] duration-(--dur-base) ease-(--ease-out) select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-bone-50 text-ink-950 hover:bg-forge-500 hover:text-ink-950 hover:shadow-glow",
  secondary: "border border-line-strong text-bone-50 hover:border-bone-50 hover:bg-bone-50/5",
  ghost: "text-bone-50 hover:text-forge-300",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 px-7 text-base",
};

export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      className={cn("shrink-0 transition-transform duration-(--dur-base) ease-(--ease-out) group-hover:translate-x-1", className)}
    >
      <path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Common = {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonLinkProps = Common & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type ButtonProps = Common & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

export function Button(props: ButtonLinkProps | ButtonProps) {
  const { variant = "primary", size = "md", arrow = false, magnetic = true, className, children } = props;
  const ref = useMagnetic<HTMLElement>(magnetic);
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href) {
    const { href, variant: _v, size: _s, arrow: _a, magnetic: _m, className: _c, children: _ch, ...rest } = props;
    void _v; void _s; void _a; void _m; void _c; void _ch;
    return (
      <Link href={href} className={classes} ref={ref as React.Ref<HTMLAnchorElement>} {...rest}>
        <span>{children}</span>
        {arrow && <Arrow />}
      </Link>
    );
  }
  const { variant: _v, size: _s, arrow: _a, magnetic: _m, className: _c, children: _ch, href: _h, ...rest } = props as ButtonProps;
  void _v; void _s; void _a; void _m; void _c; void _ch; void _h;
  return (
    <button className={classes} ref={ref as React.Ref<HTMLButtonElement>} {...rest}>
      <span>{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}
