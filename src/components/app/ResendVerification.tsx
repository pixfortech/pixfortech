"use client";

import { useState, useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth/client";
import { AppButton } from "@/components/app/primitives";
import { copy } from "@content/microcopy";
import { authPip } from "@/pixel/auth/store";

/**
 * A deliberate "send me another link" button. Sign-in never mails on its
 * own; this is the only way an existing account asks for a new
 * verification email. The server enforces one send per address per minute
 * (and says how long is left); the countdown here mirrors it and survives a
 * reload within the tab.
 */
const COOLDOWN_S = 60;
const storeKey = (email: string) => `pf:verify-resend:${email.trim().toLowerCase()}`;

// One shared clock, ticking only while a countdown is on screen.
let now = 0;
const listeners = new Set<() => void>();
let timer = 0;
function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) {
    now = Date.now();
    timer = window.setInterval(() => { now = Date.now(); for (const f of listeners) f(); }, 1000);
  }
  return () => { listeners.delete(l); if (!listeners.size) { clearInterval(timer); timer = 0; } };
}
const bump = () => { now = Date.now(); for (const f of listeners) f(); };

function readUntil(email: string): number {
  try { return Number(sessionStorage.getItem(storeKey(email))) || 0; } catch { return 0; }
}
function writeUntil(email: string, until: number) {
  try { sessionStorage.setItem(storeKey(email), String(until)); } catch { /* storage unavailable: the server still enforces the window */ }
  bump();
}

function useCooldown(email: string): number {
  return useSyncExternalStore(subscribe, () => {
    const left = readUntil(email) - (now || Date.now());
    return left > 0 ? Math.ceil(left / 1000) : 0;
  }, () => 0);
}

type Status = "idle" | "sending" | "sent" | "failed";

export function ResendVerification({ email, sentAlready = false, callbackURL = "/login?verified=1" }: { email: string; sentAlready?: boolean; callbackURL?: string }) {
  const [status, setStatus] = useState<Status>(sentAlready ? "sent" : "idle");
  const wait = useCooldown(email);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function resend() {
    if (!valid || wait > 0 || status === "sending") return;
    setStatus("sending");
    const res = await authClient.sendVerificationEmail({ email: email.trim(), callbackURL }).catch(() => ({ error: { status: 0, message: "" } as { status: number; message?: string; code?: string } }));
    if (!res.error) {
      writeUntil(email, Date.now() + COOLDOWN_S * 1000);
      setStatus("sent");
      authPip.dispatch({ type: "verifySent" });
      return;
    }
    if (res.error.status === 429) {
      // The server's window is the truth; take its remaining seconds when it names them.
      const secs = Number(/(\d+)\s*second/.exec(res.error.message ?? "")?.[1]) || COOLDOWN_S;
      writeUntil(email, Date.now() + secs * 1000);
      setStatus((s) => (s === "sending" ? "idle" : s));
      return;
    }
    setStatus("failed");
    authPip.dispatch({ type: "verifyFailed" });
  }

  return (
    <div className="flex flex-col gap-2" data-testid="resend-verification">
      <AppButton type="button" variant="secondary" onClick={resend} disabled={!valid || wait > 0 || status === "sending"} data-testid="resend-verification-button">
        {status === "sending" ? copy.auth.resendSending : copy.auth.resendButton}
      </AppButton>
      <p aria-live="polite" className="min-h-[1.25rem] text-[0.8125rem]" data-testid="resend-status" data-status={status} data-wait={wait}>
        {status === "sent" && <span className="text-[#9fe0bb]">{copy.auth.resendSent} </span>}
        {status === "failed" && <span className="text-forge-300" role="alert">{copy.auth.resendFailed} </span>}
        {wait > 0 && <span className="text-bone-400" data-testid="resend-cooldown">{copy.auth.resendCooldown(wait)}</span>}
      </p>
    </div>
  );
}
