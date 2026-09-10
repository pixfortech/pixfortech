"use client";

import { useSyncExternalStore } from "react";
import { behaviour } from "../behaviour/store";
import type { PipLine } from "../behaviour/messages";
import { initialAuthState, reduceAuth, type AuthEvent, type AuthPage, type AuthPipState } from "./logic";

/**
 * The gatekeeper's mood, shared between the auth forms (which report
 * events) and the stage (which draws him). Lines come through the
 * behaviour store's history so nothing repeats until a category is spent.
 */
type Snapshot = { state: AuthPipState; line: PipLine | null; tick: number };
type Listener = () => void;

const BUBBLE_MS = 5200;
const IDLE_MS = 75_000;

class AuthPipStore {
  private snap: Snapshot = { state: initialAuthState(), line: null, tick: 0 };
  private listeners = new Set<Listener>();
  private settleTimer = 0;
  private bubbleTimer = 0;
  private idleTimer = 0;
  private lineLog: string[] = [];

  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  get = () => this.snap;
  /** Every line spoken this page life, for QA and tests. */
  spokenIds() { return [...this.lineLog]; }

  private set(patch: Partial<Snapshot>) { this.snap = { ...this.snap, ...patch, tick: this.snap.tick + 1 }; for (const l of this.listeners) l(); }

  dispatch(e: AuthEvent) {
    const prev = this.snap.state;
    const next = reduceAuth(prev, e);
    if (next === prev) { this.touch(); return; }
    clearTimeout(this.settleTimer);
    if (next.settleTo && next.settleMs > 0) {
      const target = next.settleTo;
      this.settleTimer = window.setTimeout(() => { const cur = this.snap.state; if (cur.settleTo === target) this.set({ state: { ...cur, emotion: target, settleTo: null, settleMs: 0, say: null } }); }, next.settleMs);
    }
    let line = this.snap.line;
    if (next.say) {
      const picked = behaviour.takeLine(next.say);
      if (picked) {
        line = picked; this.lineLog.push(picked.id);
        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = window.setTimeout(() => this.set({ line: null }), BUBBLE_MS);
      }
    }
    this.set({ state: next, line });
    if (e.type !== "idleTimeout") this.touch();
  }

  /** Any activity resets the doze timer; dozing only from a resting state. */
  private touch() {
    clearTimeout(this.idleTimer);
    if (typeof window === "undefined") return;
    this.idleTimer = window.setTimeout(() => this.dispatch({ type: "idleTimeout" }), IDLE_MS);
  }

  load(page: AuthPage) { this.dispatch({ type: "load", page }); }
  reset() { clearTimeout(this.settleTimer); clearTimeout(this.bubbleTimer); clearTimeout(this.idleTimer); this.snap = { state: initialAuthState(), line: null, tick: 0 }; this.lineLog = []; }
}

export const authPip = new AuthPipStore();

const serverSnap: Snapshot = { state: initialAuthState(), line: null, tick: 0 };
export function useAuthPip(): Snapshot {
  return useSyncExternalStore(authPip.subscribe, authPip.get, () => serverSnap);
}
