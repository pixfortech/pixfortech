"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { Field, inputCls } from "@/components/app/primitives";
import { ResendVerification } from "@/components/app/ResendVerification";
import { maskEmail } from "@/lib/mask-email";
import { copy } from "@content/microcopy";

/** Where the link went (masked), and a deliberate way to ask for another. */
export function VerifyEmailPanel({ email }: { email?: string }) {
  const hydrated = useHydrated();
  const [typed, setTyped] = useState("");
  if (email) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[0.875rem] text-bone-300" data-testid="verify-sent-to">
          {copy.auth.verifySentTo} <span className="font-mono text-bone-50">{maskEmail(email)}</span>
        </p>
        <ResendVerification email={email} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.875rem] text-bone-300">{copy.auth.verifyNoEmail}</p>
      <Field label="Email" htmlFor="verify-email">
        <input id="verify-email" type="email" autoComplete="email" disabled={!hydrated} value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} />
      </Field>
      <ResendVerification email={typed} />
    </div>
  );
}
