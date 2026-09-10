"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { authClient } from "@/lib/auth/client";
import { AppButton, Field, inputCls } from "@/components/app/primitives";
import { copy } from "@content/microcopy";
import { authPip } from "@/pixel/auth/store";

export function ForgotForm() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    authPip.dispatch({ type: "submit" });
    // Always report success so the form cannot be used to probe which emails exist.
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }).catch(() => undefined);
    setBusy(false); setDone(true);
    authPip.dispatch({ type: "forgotSent" });
  }
  if (done) return <p className="rounded-md border border-line bg-ink-900 px-4 py-3 text-[0.875rem] text-bone-200" data-testid="reset-sent">{copy.auth.forgotSent}</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email">
        <input id="email" type="email" required disabled={!hydrated} autoComplete="email" value={email}
          onChange={(e) => { setEmail(e.target.value); authPip.dispatch({ type: "emailTyping" }); }}
          onFocus={() => authPip.dispatch({ type: "emailFocus" })} onBlur={() => authPip.dispatch({ type: "emailBlur" })} className={inputCls} />
      </Field>
      <AppButton type="submit" disabled={busy || !email}>{busy ? "Sending…" : "Send reset link"}</AppButton>
    </form>
  );
}
