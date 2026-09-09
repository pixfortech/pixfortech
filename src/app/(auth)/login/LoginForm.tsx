"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Field, inputCls, AppButton } from "@/components/app/primitives";


export function LoginForm({ next, google }: { next?: string; google: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      if (mode === "magic") {
        const res = await authClient.signIn.magicLink({ email, callbackURL: next ?? "/portal" });
        if (res.error) setError(res.error.message ?? "Could not send the link."); else setSent(true);
        return;
      }
      const res = await authClient.signIn.email({ email, password, rememberMe: true });
      if (res.error) { setError(res.error.status === 403 ? "Please verify your email first. We have sent you a new link." : "That email and password do not match."); return; }
      router.replace(next ?? "/redirect");
      router.refresh();
    } finally { setBusy(false); }
  }

  if (sent) return <p className="rounded-md border border-line bg-ink-900 px-4 py-3 text-[0.875rem] text-bone-200">Check your inbox. The sign-in link works once and expires in a few minutes.</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email"><input id="email" type="email" autoComplete="email" required disabled={!hydrated} value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
      {mode === "password" && (
        <Field label="Password" htmlFor="password"><input id="password" type="password" autoComplete="current-password" required disabled={!hydrated} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></Field>
      )}
      {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
      <AppButton type="submit" disabled={busy || !email || (mode === "password" && !password)}>{busy ? "Signing in…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}</AppButton>
      <div className="flex items-center justify-between text-[0.8125rem]">
        <button type="button" onClick={() => setMode(mode === "password" ? "magic" : "password")} className="text-bone-400 hover:text-bone-50">{mode === "password" ? "Use a magic link instead" : "Use a password instead"}</button>
        {google && <button type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next ?? "/redirect" })} className="text-bone-400 hover:text-bone-50">Continue with Google</button>}
      </div>
    </form>
  );
}
