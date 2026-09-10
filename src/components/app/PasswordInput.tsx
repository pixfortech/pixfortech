"use client";

import { useState } from "react";
import { inputCls } from "./primitives";
import { authPip } from "@/pixel/auth/store";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

/**
 * Password field with a show/hide toggle. Reports focus, typing and
 * visibility to the gatekeeper so PiP can look away; it never reports what
 * was typed or how much of it. The toggle is a real button with a state,
 * so keyboard and screen-reader users get the same control.
 */
export function PasswordInput({ id, value, onChange, autoComplete, disabled, required = true, describedBy }: { id: string; value: string; onChange: (v: string) => void; autoComplete: "current-password" | "new-password"; disabled?: boolean; required?: boolean; describedBy?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={shown ? "text" : "password"} autoComplete={autoComplete} required={required} disabled={disabled} value={value} aria-describedby={describedBy}
        onChange={(e) => { onChange(e.target.value); authPip.dispatch({ type: "passwordTyping" }); }}
        onFocus={() => authPip.dispatch({ type: "passwordFocus" })} onBlur={() => authPip.dispatch({ type: "passwordBlur" })}
        className={cn(inputCls, "pr-11")} data-testid={`${id}-input`} />
      <button type="button" aria-pressed={shown} aria-label={shown ? copy.auth.hidePassword : copy.auth.showPassword} data-testid={`${id}-toggle`} disabled={disabled}
        onClick={() => { const next = !shown; setShown(next); authPip.dispatch({ type: next ? "passwordShown" : "passwordHidden" }); }}
        className="absolute right-1.5 top-1/2 grid h-7 w-8 -translate-y-1/2 place-items-center rounded-sm text-bone-400 hover:text-bone-50 focus-visible:outline-2 focus-visible:outline-forge-400 disabled:opacity-50">
        {shown ? (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 3l14 14" /><path d="M8.5 8.6A2 2 0 0 0 11.4 11.5" /><path d="M6.3 6.4C4.3 7.6 3 10 3 10s2.5 4.5 7 4.5c1.2 0 2.3-.3 3.2-.8" /><path d="M8.7 5.7C9.1 5.6 9.6 5.5 10 5.5c4.5 0 7 4.5 7 4.5s-.6 1.1-1.7 2.2" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 10s2.5-4.5 7-4.5 7 4.5 7 4.5-2.5 4.5-7 4.5S3 10 3 10Z" /><circle cx="10" cy="10" r="2" /></svg>
        )}
      </button>
    </div>
  );
}
