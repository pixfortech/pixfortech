"use client";

import { useState, useTransition } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Field, inputCls, AppButton } from "@/components/app/primitives";
import { copy } from "@content/microcopy";
import { authPip } from "@/pixel/auth/store";
import { PasswordInput } from "@/components/app/PasswordInput";
import { ResendVerification } from "@/components/app/ResendVerification";
import { signInErrorMessage } from "@/lib/auth/sign-in-error";
import { homeForRole, isRole } from "@/lib/auth/roles";
import { safeNext } from "@/lib/auth/safe-next";

export function LoginForm({ next: requestedNext, google }: { next?: string; google: boolean }) {
  const router = useRouter();
  const next = safeNext(requestedNext);
  const [opening, startOpening] = useTransition();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setUnverified(null); setBusy(true);
    authPip.dispatch({ type: "submit" });
    try {
      if (mode === "magic") {
        const res = await authClient.signIn.magicLink({ email, callbackURL: next ?? "/redirect" });
        if (res.error) { setError(res.error.message ?? "Could not send the link."); authPip.dispatch({ type: "failure" }); } else { setSent(true); authPip.dispatch({ type: "magicSent" }); }
        return;
      }
      const res = await authClient.signIn.email({ email, password, rememberMe: true });
      if (res.error) {
        const outcome = signInErrorMessage(res.error);
        if (outcome === "unverified") { setUnverified(email.trim()); authPip.dispatch({ type: "verifyNeeded" }); return; }
        setError(outcome); authPip.dispatch({ type: "failure" }); return;
      }
      // PiP opens the gate while the dashboard loads; navigation never waits for him.
      // The sign-in response carries the role, so the destination is known now: no
      // /redirect hop, no second session lookup, no refresh (the dashboard's own
      // layout reads the new session cookie on this navigation).
      authPip.dispatch({ type: "success" });
      const role = (res.data?.user as { role?: unknown } | undefined)?.role;
      const destination = next ?? (isRole(role) ? homeForRole(role) : "/redirect");
      startOpening(() => router.replace(destination));
    } finally { setBusy(false); }
  }

  if (sent) return <p className="rounded-md border border-line bg-ink-900 px-4 py-3 text-[0.875rem] text-bone-200" data-testid="magic-sent">{copy.auth.magicSent}</p>;

  const switchMode = () => {
    const nextMode = mode === "password" ? "magic" : "password";
    setMode(nextMode);
    authPip.dispatch({ type: nextMode === "magic" ? "magicMode" : "passwordMode" });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate data-testid="login-form">
      <Field label="Email" htmlFor="email">
        <input id="email" type="email" autoComplete="email" required disabled={!hydrated} value={email}
          onChange={(e) => { setEmail(e.target.value); authPip.dispatch({ type: "emailTyping" }); }}
          onFocus={() => authPip.dispatch({ type: "emailFocus" })} onBlur={() => authPip.dispatch({ type: "emailBlur" })} className={inputCls} />
      </Field>
      {mode === "password" && (
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} disabled={!hydrated} />
        </Field>
      )}
      {error && <p role="alert" className="text-[0.8125rem] text-forge-300" data-testid="login-error">{error}</p>}
      {unverified && (
        <div className="flex flex-col gap-3 rounded-md border border-forge-500/40 bg-forge-500/10 px-4 py-3" data-testid="login-unverified">
          <p role="alert" className="text-[0.875rem] font-medium text-bone-50">{copy.auth.loginUnverified}</p>
          <p className="text-[0.8125rem] text-bone-300">{copy.auth.loginUnverifiedHint}</p>
          <ResendVerification email={unverified} />
        </div>
      )}
      <AppButton type="submit" disabled={busy || opening || !email || (mode === "password" && !password)}>{opening ? copy.auth.loginOpening : busy ? "Signing in…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}</AppButton>
      <div className="flex items-center justify-between text-[0.8125rem]">
        <button type="button" onClick={switchMode} className="text-bone-400 hover:text-bone-50">{mode === "password" ? copy.auth.magicSwitch : copy.auth.passwordSwitch}</button>
        {google && <button type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next ?? "/redirect" })} className="text-bone-400 hover:text-bone-50">Continue with Google</button>}
      </div>
    </form>
  );
}
