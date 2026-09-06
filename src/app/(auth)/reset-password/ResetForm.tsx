"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { AppButton, Field, inputCls } from "@/components/app/primitives";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 10) return setError("Use at least ten characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (res.error) return setError("That link has expired. Request a new one.");
    router.replace("/login?verified=1");
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="New password" htmlFor="password"><input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} /></Field>
      <Field label="Confirm password" htmlFor="confirm"><input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} /></Field>
      {error && <p role="alert" className="text-[0.8125rem] text-forge-300">{error}</p>}
      <AppButton type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</AppButton>
    </form>
  );
}
