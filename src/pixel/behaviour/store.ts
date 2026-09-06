"use client";

import { useSyncExternalStore } from "react";
import { isCoolingDown, pickIndex } from "./heuristics";
import { mascotMessages, type MessageKey } from "./messages";

export type MascotState =
  | "idle" | "curious" | "forging" | "guiding" | "celebrating"
  | "bored" | "dizzy" | "playing" | "lost" | "sleeping" | "hidden";

export type Bubble = { id: number; text: string; key: MessageKey; action?: { label: string; kind: "game" } };

export type BehaviourState = {
  mascot: MascotState;
  bubble: Bubble | null;
  route: string;
  formActive: boolean;
  menuOpen: boolean;
  gameOpen: boolean;
  dismissed: boolean;
  /** 0..1 furthest the visitor has scrolled on this route. */
  maxScroll: number;
  /** When pointer is near the mascot, it looks. Normalised -1..1. */
  look: [number, number];
  transitioning: boolean;
  /** True while the page is actively scrolling on a touch device. */
  scrolling: boolean;
};

/** Priorities: a new event only replaces the current bubble if it outranks it. */
const PRIORITY: Record<MessageKey, number> = {
  formSuccess: 90, formFocus: 85, notFound: 80, gameWin: 75, gameExit: 70, gameInvite: 60, pageComplete: 65,
  projectComplete: 60, scrollLoop: 50, dizzy: 50, dwell: 40, wake: 30, themeShift: 25, greeting: 25, idle: 20, sleeping: 10,
};

/** Cooldowns in ms; "route" keys reset on navigation. */
const COOLDOWN: Partial<Record<MessageKey, number>> = {
  dwell: 240_000, scrollLoop: 120_000, pageComplete: 120_000, idle: 60_000, themeShift: 30_000, projectComplete: 60_000, greeting: 999_999_999,
};
const SESSION_MAX: Partial<Record<MessageKey, number>> = { scrollLoop: 2, dwell: 3, idle: 6 };

const STORAGE_KEY = "pf:pip";

type Persisted = { last: Record<string, number>; counts: Record<string, number>; prev: Record<string, number>; dismissed?: boolean };

function loadPersisted(): Persisted {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch { /* private mode or disabled storage */ }
  return { last: {}, counts: {}, prev: {} };
}
function savePersisted(p: Persisted) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

class BehaviourStore {
  private state: BehaviourState = {
    mascot: "idle", bubble: null, route: "/", formActive: false, menuOpen: false, gameOpen: false, dismissed: false,
    maxScroll: 0, look: [0, 0], transitioning: false, scrolling: false,
  };
  private listeners = new Set<() => void>();
  private persisted: Persisted | null = null;
  private bubbleTimer = 0;
  private stateTimer = 0;
  private currentPriority = 0;
  private nextId = 1;

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  get = () => this.state;

  private set(patch: Partial<BehaviourState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }
  private p(): Persisted {
    if (!this.persisted) { this.persisted = loadPersisted(); if (this.persisted.dismissed) this.state = { ...this.state, dismissed: true }; }
    return this.persisted;
  }

  // ---------------------------------------------------------------- inputs
  setRoute(route: string) {
    if (route === this.state.route) return;
    this.clearBubble();
    const p = this.p();
    // per-route cooldowns reset on navigation
    delete p.last["pageComplete"]; delete p.last["dwell:route"];
    savePersisted(p);
    this.set({ route, maxScroll: 0, mascot: route === "/404" ? "lost" : "idle" });
  }
  setFormActive(v: boolean) { if (v !== this.state.formActive) { if (v) this.clearBubble(); this.set({ formActive: v }); } }
  setMenuOpen(v: boolean) { if (v !== this.state.menuOpen) this.set({ menuOpen: v }); }
  setGameOpen(v: boolean) { if (v !== this.state.gameOpen) this.set({ gameOpen: v, mascot: v ? "playing" : "idle" }); }
  setTransitioning(v: boolean) { if (v !== this.state.transitioning) this.set({ transitioning: v, mascot: v ? "forging" : this.state.mascot === "forging" ? "idle" : this.state.mascot }); }
  setScrolling(v: boolean) { if (v !== this.state.scrolling) this.set({ scrolling: v }); }
  setMaxScroll(v: number) { if (v > this.state.maxScroll + 0.01 || v >= 1) this.set({ maxScroll: Math.min(1, v) }); }
  setLook(x: number, y: number) {
    // Quantised to half steps so pointer movement re-renders the mascot rarely.
    const qx = Math.round(x * 2) / 2, qy = Math.round(y * 2) / 2;
    const [lx, ly] = this.state.look;
    if (lx !== qx || ly !== qy) this.set({ look: [qx, qy] });
  }
  dismiss() { const p = this.p(); p.dismissed = true; savePersisted(p); this.clearBubble(); this.set({ dismissed: true, mascot: "hidden" }); }

  /** Temporarily set a mascot state, reverting to idle after `ms`. */
  setMascot(state: MascotState, ms?: number) {
    clearTimeout(this.stateTimer);
    this.set({ mascot: state });
    if (ms) this.stateTimer = window.setTimeout(() => { if (this.state.mascot === state) this.set({ mascot: this.state.route === "/404" ? "lost" : "idle" }); }, ms);
  }

  /** Can a playful event fire right now? */
  private quiet(): boolean {
    const s = this.state;
    return !s.formActive && !s.menuOpen && !s.gameOpen && !s.dismissed && !s.transitioning;
  }

  /**
   * Ask to show a message for `key`. Returns true if shown. Applies priority,
   * per-key cooldowns and per-session caps. Transactional keys (formSuccess)
   * bypass the "quiet" check because they are part of the task itself.
   */
  say(key: MessageKey, opts: { state?: MascotState; stateMs?: number; durationMs?: number; action?: Bubble["action"]; force?: boolean } = {}): boolean {
    const now = Date.now();
    const p = this.p();
    const transactional = key === "formSuccess" || key === "gameWin" || key === "gameExit" || key === "notFound";
    if (!transactional && !this.quiet()) return false;
    if (this.state.dismissed && !opts.force) return false;
    const cd = COOLDOWN[key];
    if (cd && isCoolingDown(p.last, key, now, cd)) return false;
    const cap = SESSION_MAX[key];
    if (cap && (p.counts[key] ?? 0) >= cap) return false;
    const priority = PRIORITY[key];
    if (this.state.bubble && priority < this.currentPriority) return false;

    const list = mascotMessages[key];
    const idx = pickIndex(list.length, p.prev[key]);
    p.prev[key] = idx; p.last[key] = now; p.counts[key] = (p.counts[key] ?? 0) + 1;
    savePersisted(p);

    clearTimeout(this.bubbleTimer);
    this.currentPriority = priority;
    const bubble: Bubble = { id: this.nextId++, text: list[idx], key, action: opts.action };
    this.set({ bubble, mascot: opts.state ?? this.state.mascot });
    if (opts.state) this.setMascot(opts.state, opts.stateMs ?? 4000);
    const duration = opts.durationMs ?? (opts.action ? 12000 : 6000);
    this.bubbleTimer = window.setTimeout(() => this.clearBubble(bubble.id), duration);
    return true;
  }

  clearBubble(id?: number) {
    if (id !== undefined && this.state.bubble?.id !== id) return;
    clearTimeout(this.bubbleTimer);
    this.currentPriority = 0;
    if (this.state.bubble) this.set({ bubble: null });
  }

  /** For tests and the observer: has this key fired this session? */
  count(key: MessageKey) { return this.p().counts[key] ?? 0; }
}

export const behaviour = new BehaviourStore();

export function useBehaviour(): BehaviourState {
  return useSyncExternalStore(behaviour.subscribe, behaviour.get, behaviour.get);
}
