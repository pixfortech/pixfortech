"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Field, inputCls, AppButton } from "@/components/app/primitives";
import { copy } from "@content/microcopy";
import { authPip } from "@/pixel/auth/store";
import { PasswordInput } from "@/components/app/PasswordInput";

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
    authPip.dispatch({ type: "submit" });
    try {
      if (mode === "magic") {
        const res = await authClient.signIn.magicLink({ email, callbackURL: next ?? "/portal" });
        if (res.error) { setError(res.error.message ?? "Could not send the link."); authPip.dispatch({ type: "failure" }); } else { setSent(true); authPip.dispatch({ type: "magicSent" }); }
        return;
      }
      const res = await authClient.signIn.email({ email, password, rememberMe: true });
      if (res.error) { setError(res.error.status === 403 ? copy.auth.loginUnverified : copy.auth.loginWrong); authPip.dispatch({ type: "failure" }); return; }
      // PiP opens the gate; the redirect follows a beat later so the moment reads.
      authPip.dispatch({ type: "success" });
      window.setTimeout(() => { router.replace(next ?? "/redirect"); router.refresh(); }, 650);
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
      <AppButton type="submit" disabled={busy || !email || (mode === "password" && !password)}>{busy ? "Signing in…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}</AppButton>
      <div className="flex items-center justify-between text-[0.8125rem]">
        <button type="button" onClick={switchMode} className="text-bone-400 hover:text-bone-50">{mode === "password" ? copy.auth.magicSwitch : copy.auth.passwordSwitch}</button>
        {google && <button type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next ?? "/redirect" })} className="text-bone-400 hover:text-bone-50">Continue with Google</button>}
      </div>
    </form>
  );
}
