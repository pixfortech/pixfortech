"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Avatar } from "@/components/app/primitives";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";
import { behaviour } from "@/pixel/behaviour/store";
import { useHydrated } from "@/lib/useHydrated";

type SessionUser = { id: string; name: string; email: string; image?: string | null; role?: string; displayName?: string | null };
const STAFF = ["super_admin", "admin", "project_manager", "team_member"];
const areaFor = (role?: string) => (role && STAFF.includes(role) ? "admin" : "portal");
const roleLabel = (role?: string) => ({ super_admin: "Owner", admin: "Admin", project_manager: "Project manager", team_member: "Team", client_admin: "Client admin", client_member: "Client" } as Record<string, string>)[role ?? ""] ?? "Account";

/**
 * The public site's account control. Signed out: a branded sign-in link with
 * a literal accessible name. Signed in: an avatar button opening a compact,
 * keyboard-operable menu that routes by role.
 */
export function AccountControl({ variant = "desktop", onNavigate }: { variant?: "desktop" | "mobile" | "footer"; onNavigate?: () => void }) {
  const { data, isPending } = authClient.useSession();
  const hydrated = useHydrated();
  const user = (data?.user as SessionUser | undefined) ?? null;
  // The server always renders the signed-out control; the first client render must match it.
  if (!hydrated || !user) return <SignInLink variant={variant} pending={isPending || !hydrated} onNavigate={onNavigate} />;
  return <AccountMenu user={user} variant={variant} onNavigate={onNavigate} />;
}

function SignInLink({ variant, pending, onNavigate }: { variant: "desktop" | "mobile" | "footer"; pending: boolean; onNavigate?: () => void }) {
  if (variant === "footer") {
    return (
      <Link href="/login" className="link-line text-bone-200 hover:text-bone-50" aria-label={`${copy.nav.footerLogin}: sign in to Pixel Forge`} title={copy.nav.footerLoginHint} onClick={onNavigate}>{copy.nav.footerLogin}</Link>
    );
  }
  if (variant === "mobile") {
    return (
      <Link href="/login" onClick={onNavigate} aria-label={copy.nav.loginAria} className="group flex flex-col gap-1 rounded-md border border-line-strong px-4 py-3.5 text-[1rem] font-medium text-bone-50 hover:border-bone-50">
        <span className="flex items-center gap-3"><ForgeDoor /> {copy.nav.loginMobile}</span>
        <span className="pl-7 text-[0.8125rem] font-normal text-bone-400">{copy.nav.loginHint}</span>
      </Link>
    );
  }
  return (
    <Link
      href="/login"
      aria-label={copy.nav.loginAria}
      title={copy.nav.loginHint}
      data-testid="login-link"
      className={cn("group relative inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-[0.9375rem] font-medium text-bone-50 transition-colors hover:border-bone-50 hover:bg-bone-50/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400", pending && "opacity-80")}
    >
      <ForgeDoor />
      <span>{copy.nav.loginLabel}</span>
      <span className="pointer-events-none absolute top-full right-0 mt-2 hidden whitespace-nowrap rounded-md border border-line bg-ink-850 px-2.5 py-1.5 text-[0.75rem] text-bone-200 shadow-2 group-hover:block group-focus-visible:block" aria-hidden="true">{copy.nav.loginHint}</span>
    </Link>
  );
}

function ForgeDoor() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 text-forge-400">
      <rect x="1" y="1" width="4" height="4" fill="currentColor" /><rect x="1" y="9" width="4" height="4" fill="currentColor" />
      <rect x="9" y="1" width="4" height="4" fill="currentColor" opacity="0.5" /><rect x="9" y="9" width="4" height="4" fill="currentColor" opacity="0.5" />
      <rect x="5" y="5" width="4" height="4" fill="currentColor" className="transition-transform duration-300 group-hover:translate-x-[3px]" />
    </svg>
  );
}

function AccountMenu({ user, variant, onNavigate }: { user: SessionUser; variant: "desktop" | "mobile" | "footer"; onNavigate?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const firstItem = useRef<HTMLAnchorElement>(null);
  const id = useId();
  const area = areaFor(user.role);
  const label = user.displayName?.trim() || user.name;
  const items = [
    { href: `/${area}`, label: copy.nav.accountMenu.dashboard },
    { href: `/${area}/projects`, label: copy.nav.accountMenu.projects },
    { href: `/${area}/notifications`, label: copy.nav.accountMenu.notifications },
    { href: `/${area}/profile`, label: copy.nav.accountMenu.profile },
    { href: `/${area}/settings`, label: copy.nav.accountMenu.settings },
  ];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); (ref.current?.querySelector("button") as HTMLButtonElement | null)?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
        const i = links.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
        links[next]?.focus(); e.preventDefault();
      }
    };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstItem.current?.focus(), 30);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open]);

  const signOut = async () => {
    behaviour.say("logout", { force: true });
    await authClient.signOut();
    setOpen(false);
    onNavigate?.();
    router.replace("/");
    router.refresh();
  };

  if (variant === "mobile") {
    return (
      <div className="rounded-md border border-line-strong p-2" data-testid="account-menu-mobile">
        <div className="flex items-center gap-3 px-2 py-2"><Avatar name={user.name} image={user.image} size={36} /><div className="min-w-0"><p className="truncate font-medium text-bone-50">{label}</p><p className="truncate text-[0.8125rem] text-bone-400">{roleLabel(user.role)} · {copy.nav.accountLabel}</p></div></div>
        <ul className="grid grid-cols-2 gap-1">
          {items.map((it) => <li key={it.href}><Link href={it.href} onClick={onNavigate} className="block rounded-md px-3 py-2 text-[0.9375rem] text-bone-200 hover:bg-bone-50/5 hover:text-bone-50">{it.label}</Link></li>)}
          <li><button type="button" onClick={signOut} className="block w-full rounded-md px-3 py-2 text-left text-[0.9375rem] text-bone-200 hover:bg-bone-50/5 hover:text-bone-50">{copy.nav.accountMenu.signOut}</button></li>
        </ul>
      </div>
    );
  }
  if (variant === "footer") {
    return <Link href={`/${area}`} className="link-line text-bone-200 hover:text-bone-50" onClick={onNavigate}>{copy.nav.accountLabel} →</Link>;
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={id}
        aria-label={`${label.split(" ")[0]}: ${copy.nav.accountAria}`}
        data-testid="account-button"
        className="flex h-10 items-center gap-2.5 rounded-pill border border-line-strong py-1 pr-3 pl-1 text-[0.9375rem] font-medium text-bone-50 transition-colors hover:border-bone-50 hover:bg-bone-50/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400"
      >
        <Avatar name={user.name} image={user.image} size={30} className="rounded-pill" />
        <span className="hidden max-w-[9rem] truncate xl:inline">{label.split(" ")[0]}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={cn("transition-transform", open && "rotate-180")}><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      {open && (
        <div id={id} role="menu" aria-label={copy.nav.accountLabel} data-testid="account-menu" className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-lg border border-line bg-ink-850 shadow-2">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={user.name} image={user.image} size={34} />
            <div className="min-w-0"><p className="truncate text-[0.875rem] font-medium text-bone-50">{label}</p><p className="truncate text-[0.75rem] text-bone-400">{roleLabel(user.role)} · {user.email}</p></div>
          </div>
          <ul className="py-1">
            {items.map((it, i) => (
              <li key={it.href}><Link ref={i === 0 ? firstItem : undefined} role="menuitem" href={it.href} onClick={() => { setOpen(false); onNavigate?.(); }} className="block px-4 py-2 text-[0.875rem] text-bone-200 hover:bg-bone-50/5 hover:text-bone-50 focus-visible:bg-bone-50/5 focus-visible:outline-none">{it.label}</Link></li>
            ))}
          </ul>
          <div className="border-t border-line p-1">
            <button type="button" role="menuitem" onClick={signOut} className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-bone-50/5 focus-visible:bg-bone-50/5 focus-visible:outline-none">
              <span className="text-[0.875rem] font-medium text-bone-50">{copy.nav.accountMenu.signOut}</span>
              <span className="text-[0.75rem] text-bone-400">{copy.nav.accountMenu.signOutHint}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
