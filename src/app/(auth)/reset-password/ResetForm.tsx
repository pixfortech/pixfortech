"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { AppButton, Field } from "@/components/app/primitives";
import { PasswordInput } from "@/components/app/PasswordInput";
import { authPip } from "@/pixel/auth/store";

export function ResetForm({ token }: { token: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 10) { authPip.dispatch({ type: "warn" }); return setError("Use at least ten characters."); }
    if (password !== confirm) { authPip.dispatch({ type: "warn" }); return setError("The two passwords do not match."); }
    setBusy(true);
    authPip.dispatch({ type: "submit" });
    const res = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (res.error) { authPip.dispatch({ type: "warn" }); return setError("That link has expired. Request a new one."); }
    authPip.dispatch({ type: "resetDone" });
    window.setTimeout(() => router.replace("/login?reset=1"), 900);
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="New password" htmlFor="password"><PasswordInput id="password" autoComplete="new-password" value={password} onChange={setPassword} disabled={!hydrated} /></Field>
      <Field label="Confirm password" htmlFor="confirm"><PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm} disabled={!hydrated} /></Field>
      {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
      <AppButton type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</AppButton>
    </form>
  );
}
