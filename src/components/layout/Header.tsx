"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Monogram, Wordmark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { nav } from "@/lib/navigation";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const reduce = useReducedMotion();
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock scroll, trap escape, move focus
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstLink.current?.focus(), 50);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-forge-500 focus:px-4 focus:py-2 focus:text-ink-950 focus:font-medium"
      >
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
        <div className="container-x">
          <div
            className={cn(
              "pointer-events-auto mt-3 flex h-14 items-center justify-between rounded-lg border px-3 pl-4 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-(--dur-base) ease-(--ease-out) sm:mt-4 sm:h-16 sm:pl-5",
              scrolled || open
                ? "border-line bg-ink-900/80 backdrop-blur-xl shadow-2"
                : "border-transparent bg-transparent",
            )}
          >
            <Link href="/" className="flex items-center gap-3 text-bone-50 rounded-xs" aria-label="Pixel Forge Technologies, home">
              <Monogram size={26} />
              <Wordmark className="text-[1.0625rem]" />
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-pill px-3.5 py-2 text-[0.9375rem] font-medium transition-colors duration-(--dur-fast)",
                    isActive(item.href) ? "text-bone-50" : "text-bone-200 hover:text-bone-50",
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="absolute left-1/2 -bottom-0.5 h-1 w-1 -translate-x-1/2 bg-forge-500" aria-hidden="true" />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <Button href="/contact" size="md" magnetic={false}>
                  Start a project
                </Button>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md text-bone-50 hover:bg-bone-50/5 lg:hidden"
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                <span className="relative block h-3.5 w-5" aria-hidden="true">
                  <span className={cn("absolute left-0 top-0 h-[1.5px] w-full bg-current transition-transform duration-(--dur-base) ease-(--ease-out)", open && "translate-y-[6px] rotate-45")} />
                  <span className={cn("absolute left-0 top-[6px] h-[1.5px] w-full bg-current transition-opacity duration-(--dur-fast)", open && "opacity-0")} />
                  <span className={cn("absolute left-0 bottom-0 h-[1.5px] w-full bg-current transition-transform duration-(--dur-base) ease-(--ease-out)", open && "-translate-y-[6px] -rotate-45")} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            className="fixed inset-0 z-40 flex flex-col bg-ink-950/95 backdrop-blur-xl lg:hidden"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="container-x flex flex-1 flex-col pt-24 pb-8">
              <nav aria-label="Mobile" className="flex flex-col">
                {nav.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      ref={i === 0 ? firstLink : undefined}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className="group flex items-baseline justify-between border-b border-line py-5 font-display text-[2rem] font-semibold tracking-[-0.02em] text-bone-50"
                    >
                      <span>{item.label}</span>
                      <span className="num text-xs text-bone-400 group-hover:text-forge-400">0{i + 1}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-auto pt-10">
                <Button href="/contact" size="lg" className="w-full" magnetic={false} arrow onClick={() => setOpen(false)}>
                  Start a project
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
