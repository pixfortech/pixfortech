import Link from "next/link";
import { Monogram } from "@/components/ui/Logo";
import type { ReactNode } from "react";
import { AuthStage } from "@/pixel/auth/AuthStage";
import { copy } from "@content/microcopy";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col bg-ink-900">
      <div className="absolute inset-0 grid-lines opacity-50 [mask-image:radial-gradient(ellipse_at_50%_0%,black_10%,transparent_65%)]" aria-hidden="true" />
      <header className="relative container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-bone-50" aria-label="Pixel Forge Technologies, home"><Monogram size={24} /><span className="font-display text-[1rem] font-semibold tracking-[-0.02em]">Pixel Forge</span></Link>
        <Link href="/contact" className="text-[0.8125rem] text-bone-400 hover:text-bone-50">{copy.auth.notClient}</Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="auth-shell">
          <AuthStage />
          <div className="auth-shell__form flex justify-center">{children}</div>
        </div>
      </main>
      <footer className="relative container-x pb-6 text-[0.75rem] text-bone-600">Pixel Forge platform · <Link href="/privacy" className="hover:text-bone-400">Privacy</Link> · <Link href="/terms" className="hover:text-bone-400">Terms</Link></footer>
    </div>
  );
}
