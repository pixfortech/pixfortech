"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { authClient } from "@/lib/auth/client";
import { AppButton, Field, inputCls } from "@/components/app/primitives";

export function ForgotForm() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    // Always report success so the form cannot be used to probe which emails exist.
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }).catch(() => undefined);
    setBusy(false); setDone(true);
  }
  if (done) return <p className="rounded-md border border-line bg-ink-900 px-4 py-3 text-[0.875rem] text-bone-200">If that address has an account, a reset link is in its inbox. It expires in an hour.</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email"><input id="email" type="email" required disabled={!hydrated} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
      <AppButton type="submit" disabled={busy || !email}>{busy ? "Sending…" : "Send reset link"}</AppButton>
    </form>
  );
}
