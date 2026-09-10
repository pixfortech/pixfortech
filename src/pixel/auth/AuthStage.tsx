"use client";

import { AuthPip } from "./AuthPip";
import { useAuthPip } from "./store";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

/**
 * The forge gate. Two pixel pillars, a lintel, a faint grid, and PiP on
 * watch in front. The gate glows when the key fits, dims while a secret is
 * being typed, and stays quiet otherwise. On phones it collapses to a strip
 * with PiP beside his line so the form keeps the room.
 */
export function AuthStage() {
  const { state } = useAuthPip();
  const e = state.emotion;
  const open = e === "success" || e === "relieved";
  return (
    <aside className={cn("auth-stage", open && "auth-stage--open", state.secret && "auth-stage--secret", e === "error" && "auth-stage--shut", e === "sleepy" && "auth-stage--dim")} aria-label={copy.auth.stageAria} data-testid="auth-stage" data-emotion={e}>
      <div className="auth-stage__grid" aria-hidden="true" />
      <div className="auth-stage__gate" aria-hidden="true">
        <span className="auth-stage__glow" />
        <span className="auth-stage__lintel" />
        <span className="auth-stage__pillar auth-stage__pillar--l" />
        <span className="auth-stage__pillar auth-stage__pillar--r" />
        <span className="auth-stage__sill" />
      </div>
      <AuthPip className="auth-stage__pip" />
      <p className="auth-stage__caption" aria-hidden="true"><span className="auth-stage__dot" />{copy.auth.stageCaption}</p>
    </aside>
  );
}
