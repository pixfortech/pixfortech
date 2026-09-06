"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Monogram } from "@/components/ui/Logo";
import { Avatar } from "./primitives";
import { NotificationBell, type NotificationItem } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

const Icon = ({ name }: { name: string }) => {
  const paths: Record<string, string> = {
    home: "M3 10 10 3l7 7M5 9v8h10V9",
    projects: "M3 4h6l2 2h6v10H3zM3 8h14",
    tasks: "M4 5h12M4 10h12M4 15h8M15 13l2 2 3-3",
    requests: "M4 4h12v9H8l-4 3zM7 8h6",
    messages: "M3 4h14v8H9l-3 3v-3H3zM6 7h8M6 9.5h5",
    files: "M5 3h6l4 4v10H5zM11 3v4h4",
    clients: "M10 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM4 17a6 6 0 0 1 12 0",
    team: "M7 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm6 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2 16a5 5 0 0 1 10 0m1-1a4 4 0 0 1 5 1",
    bell: "M5 8a5 5 0 0 1 10 0v3l1.5 2.5h-13L5 11zM8 16a2 2 0 0 0 4 0",
    activity: "M2 10h4l2-5 3 10 2-5h5",
    settings: "M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v2m0 12v2m8-8h-2M4 10H2m13.7-5.7-1.4 1.4M6.7 13.3l-1.4 1.4m0-9.4 1.4 1.4m7.3 7.3 1.4 1.4",
    approvals: "M4 10l4 4 8-9",
    profile: "M10 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3 17a7 7 0 0 1 14 0",
    timeline: "M3 5h14M3 10h9M3 15h12",
  };
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.home} /></svg>;
};

export function AppShell({ area, nav, user, notifications, children, searchLinks }: { area: "portal" | "admin"; nav: NavItem[]; user: { name: string; email: string; image: string | null; role: string; organisationName?: string | null }; notifications: NotificationItem[]; children: ReactNode; searchLinks: { label: string; href: string }[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === `/${area}` ? pathname === href : pathname.startsWith(href));

  const signOut = async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); };

  const sidebar = (
    <nav aria-label={`${area} navigation`} className="flex h-full flex-col">
      <Link href={`/${area}`} className="flex items-center gap-3 px-4 py-4 text-bone-50">
        <Monogram size={22} />
        <span className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em]">Pixel Forge <span className="text-bone-400">{area === "admin" ? "Admin" : "Portal"}</span></span>
      </Link>
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {nav.map((n) => (
          <li key={n.href}>
            <Link href={n.href} onClick={() => setOpen(false)} aria-current={active(n.href) ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[0.875rem] transition-colors", active(n.href) ? "bg-bone-50/8 text-bone-50" : "text-bone-200 hover:bg-bone-50/5 hover:text-bone-50")}>
              <span className={cn("text-bone-400", active(n.href) && "text-forge-400")}><Icon name={n.icon} /></span>
              <span className="flex-1">{n.label}</span>
              {n.badge ? <span className="num rounded-pill bg-forge-500/15 px-1.5 text-[0.6875rem] font-semibold text-forge-300">{n.badge}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar name={user.name} image={user.image} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium text-bone-50">{user.name}</p>
            <p className="truncate text-[0.6875rem] text-bone-400">{user.organisationName ?? user.role.replace(/_/g, " ")}</p>
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          <Link href={`/${area}/profile`} className="flex-1 rounded-md px-2 py-1.5 text-center text-[0.75rem] text-bone-400 hover:bg-bone-50/5 hover:text-bone-50">Profile</Link>
          <button type="button" onClick={signOut} className="flex-1 rounded-md px-2 py-1.5 text-[0.75rem] text-bone-400 hover:bg-bone-50/5 hover:text-bone-50">Sign out</button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-[100svh] bg-ink-900 text-bone-50">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-ink-950 lg:block"><div className="sticky top-0 h-[100svh]">{sidebar}</div></aside>
      {open && (
        <div className="fixed inset-x-0 top-0 z-[70] h-dvh lg:hidden" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
          <div className="absolute inset-0 bg-ink-950/70" onClick={() => setOpen(false)} />
          <aside className="absolute top-0 left-0 flex h-full w-72 flex-col overflow-y-auto border-r border-line bg-ink-950 shadow-2">
            <button type="button" autoFocus onClick={() => setOpen(false)} className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-md text-bone-400 hover:bg-bone-50/5 hover:text-bone-50" aria-label="Close menu">×</button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-ink-900/85 px-3 backdrop-blur-md sm:px-5">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md text-bone-200 hover:bg-bone-50/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><span className="block h-3 w-4 border-y border-current" aria-hidden="true" /></button>
          <button type="button" onClick={() => window.dispatchEvent(new Event("pf:open-search"))} className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line bg-ink-850/60 px-3 text-left text-[0.8125rem] text-bone-400 hover:border-line-strong sm:max-w-md" aria-label="Search (Ctrl or Command K)">
            <span aria-hidden="true">⌕</span><span className="flex-1 truncate">Search projects, requests, tasks…</span><kbd className="hidden rounded-xs border border-line px-1.5 text-[0.6875rem] sm:inline">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell items={notifications} area={area} />
            <Link href={`/${area}/profile`} className="hidden rounded-md p-1 hover:bg-bone-50/5 sm:block" aria-label="Your profile"><Avatar name={user.name} image={user.image} size={28} /></Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <CommandPalette area={area} links={searchLinks} />
    </div>
  );
}
