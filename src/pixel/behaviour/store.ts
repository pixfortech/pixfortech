"use client";

import { useSyncExternalStore } from "react";
import { isCoolingDown } from "./heuristics";
import { GAME_IDS, linesFor, type GameId, type MessageKey, type PipLine } from "./messages";
import { mergeHistory, pickGame, pickLine, recordGame, recordShown, type GameHistory, type ShownHistory } from "./selection";

export type MascotState =
  | "idle" | "curious" | "forging" | "guiding" | "celebrating"
  | "bored" | "dizzy" | "playing" | "lost" | "sleeping" | "hidden";

export type Bubble = { id: number; text: string; lineId: string; key: MessageKey; action?: { label: string; kind: "game"; game: GameId } };

export type BehaviourState = {
  mascot: MascotState;
  bubble: Bubble | null;
  route: string;
  formActive: boolean;
  menuOpen: boolean;
  gameOpen: boolean;
  /** Visitor hid PiP. Persistent across visits until restored. */
  dismissed: boolean;
  /** Product surfaces: PiP only speaks when spoken to or when something happened. */
  quiet: boolean;
  /** 0..1 furthest the visitor has scrolled on this route. */
  maxScroll: number;
  /** When pointer is near the mascot, it looks. Normalised -1..1. */
  look: [number, number];
  transitioning: boolean;
  /** True while the page is actively scrolling on a touch device. */
  scrolling: boolean;
  online: boolean;
};

/** Priorities: a new event only replaces the current bubble if it outranks it. */
const PRIORITY: Partial<Record<string, number>> = {
  formSuccess: 90, error: 88, formFocus: 85, notFound: 80, offline: 80, reconnect: 78, restore: 78, logout: 76, loginSuccess: 74,
  gameInvite: 60, pageComplete: 65, projectComplete: 60, heroSecret: 62, approval: 60, request: 58, fileUpload: 55, notification: 55, profile: 55, projectDone: 60,
  scrollLoop: 50, dizzy: 50, heroTap: 45, heroDrag: 45, dashboardEmpty: 45, dwell: 40, poke: 40, wake: 30, hide: 30, themeShift: 25, greeting: 25, returning: 25, dashboard: 24, login: 24,
  work: 22, services: 22, about: 22, process: 22, technologies: 22, careers: 22, contact: 22, insights: 22, legal: 22, project: 24, hero: 22, scroll: 20, pointer: 18, idle: 20, sleeping: 10,
};
const priorityOf = (key: string) => (key.startsWith("game.") ? 75 : (PRIORITY[key] ?? 30));

/** Cooldowns in ms per key. */
const COOLDOWN: Partial<Record<string, number>> = {
  dwell: 240_000, scrollLoop: 120_000, pageComplete: 120_000, idle: 60_000, themeShift: 30_000, projectComplete: 60_000, greeting: 999_999_999, returning: 999_999_999,
  heroTap: 9_000, heroDrag: 20_000, heroSecret: 30_000, hero: 120_000, scroll: 90_000, pointer: 120_000, poke: 1_500, notification: 60_000, dashboard: 300_000, login: 60_000,
  work: 120_000, services: 120_000, about: 120_000, process: 120_000, technologies: 120_000, careers: 120_000, contact: 120_000, insights: 120_000, legal: 120_000, project: 45_000,
};
/** Per-session caps so PiP never becomes a chatterbox. */
const SESSION_MAX: Partial<Record<string, number>> = { scrollLoop: 2, dwell: 3, idle: 5, heroTap: 6, heroDrag: 3, poke: 12, pointer: 1, scroll: 1, hero: 1, notification: 3 };
/** Keys that bypass the "quiet surface" rule because they are the event itself. */
const EVENT_KEYS = new Set<string>(["formSuccess", "error", "notFound", "offline", "reconnect", "restore", "hide", "logout", "loginSuccess", "login", "profile", "approval", "request", "fileUpload", "notification", "projectDone", "dashboardEmpty", "dashboard", "wake", "poke"]);
/** Route-personality keys, said once per route visit after a settle delay. */
export const ROUTE_KEYS: Record<string, MessageKey> = {
  "/work": "work", "/services": "services", "/about": "about", "/process": "process", "/technologies": "technologies", "/careers": "careers", "/contact": "contact", "/insights": "insights", "/privacy": "legal", "/terms": "legal", "/login": "login", "/people": "about",
};

const LOCAL_KEY = "pf:pip:v2";
const SESSION_KEY = "pf:pip:session";
const LEGACY_KEY = "pf:pip";

/** Long-lived: what has been heard, game history, hidden state. localStorage, mirrored to the account when signed in. */
export type Persisted = { v: 2; shown: ShownHistory; games: GameHistory; hidden: boolean; visits: number; syncedAt?: number };
/** Session-scoped: cooldown timestamps, counts, what games were offered this visit. */
type SessionState = { last: Record<string, number>; counts: Record<string, number>; offered: string[]; greeted?: boolean; routeSaid: Record<string, number> };

const emptyPersisted = (): Persisted => ({ v: 2, shown: {}, games: { played: [], offered: [], last: null }, hidden: false, visits: 0 });
const emptySession = (): SessionState => ({ last: {}, counts: {}, offered: [], routeSaid: {} });

function read<T>(storage: Storage | null, key: string, fallback: () => T): T {
  try { const raw = storage?.getItem(key); if (raw) return { ...fallback(), ...(JSON.parse(raw) as T) }; } catch { /* private mode or disabled storage */ }
  return fallback();
}
function write(storage: Storage | null, key: string, value: unknown) {
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
const local = () => (typeof window === "undefined" ? null : window.localStorage);
const session = () => (typeof window === "undefined" ? null : window.sessionStorage);

type SyncListener = (p: Persisted) => void;

class BehaviourStore {
  private state: BehaviourState = {
    mascot: "idle", bubble: null, route: "/", formActive: false, menuOpen: false, gameOpen: false, dismissed: false, quiet: false,
    maxScroll: 0, look: [0, 0], transitioning: false, scrolling: false, online: true,
  };
  private listeners = new Set<() => void>();
  private syncListeners = new Set<SyncListener>();
  private persisted: Persisted | null = null;
  private sess: SessionState | null = null;
  private bubbleTimer = 0;
  private stateTimer = 0;
  private syncTimer = 0;
  private currentPriority = 0;
  private nextId = 1;

  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  get = () => this.state;

  private set(patch: Partial<BehaviourState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }
  private p(): Persisted {
    if (!this.persisted) {
      this.persisted = read(local(), LOCAL_KEY, emptyPersisted);
      // Honour a dismissal saved by the previous version of the store.
      const legacy = read<{ dismissed?: boolean }>(session(), LEGACY_KEY, () => ({}));
      if (legacy.dismissed) this.persisted.hidden = true;
      this.persisted.visits += 1;
      write(local(), LOCAL_KEY, this.persisted);
      if (this.persisted.hidden) this.state = { ...this.state, dismissed: true, mascot: "hidden" };
    }
    return this.persisted;
  }
  private s(): SessionState {
    if (!this.sess) this.sess = read(session(), SESSION_KEY, emptySession);
    return this.sess;
  }
  private savePersisted() {
    write(local(), LOCAL_KEY, this.persisted);
    clearTimeout(this.syncTimer);
    this.syncTimer = window.setTimeout(() => { for (const l of this.syncListeners) l(this.p()); }, 4000);
  }
  private saveSession() { write(session(), SESSION_KEY, this.sess); }

  // ---------------------------------------------------------------- inputs
  setRoute(route: string) {
    if (route === this.state.route) return;
    this.clearBubble();
    const s = this.s();
    delete s.last["pageComplete"];
    this.saveSession();
    this.set({ route, maxScroll: 0, mascot: this.state.dismissed ? "hidden" : route === "/404" ? "lost" : "idle" });
  }
  setFormActive(v: boolean) { if (v !== this.state.formActive) { if (v) this.clearBubble(); this.set({ formActive: v }); } }
  setMenuOpen(v: boolean) { if (v !== this.state.menuOpen) this.set({ menuOpen: v }); }
  setGameOpen(v: boolean) { if (v !== this.state.gameOpen) this.set({ gameOpen: v, mascot: v ? "playing" : this.state.dismissed ? "hidden" : "idle" }); }
  setTransitioning(v: boolean) { if (v !== this.state.transitioning) this.set({ transitioning: v, mascot: v ? "forging" : this.state.mascot === "forging" ? "idle" : this.state.mascot }); }
  setScrolling(v: boolean) { if (v !== this.state.scrolling) this.set({ scrolling: v }); }
  setQuiet(v: boolean) { if (v !== this.state.quiet) this.set({ quiet: v }); }
  setOnline(v: boolean) { if (v !== this.state.online) this.set({ online: v }); }
  setMaxScroll(v: number) { if (v > this.state.maxScroll + 0.01 || v >= 1) this.set({ maxScroll: Math.min(1, v) }); }
  setLook(x: number, y: number) {
    const qx = Math.round(x * 2) / 2, qy = Math.round(y * 2) / 2;
    const [lx, ly] = this.state.look;
    if (lx !== qx || ly !== qy) this.set({ look: [qx, qy] });
  }

  /** Load persisted state after hydration so a hidden PiP stays hidden from the first paint onwards. */
  hydrate() { const p = this.p(); if (p.hidden !== this.state.dismissed) this.set({ dismissed: p.hidden, mascot: p.hidden ? "hidden" : this.state.mascot }); }

  /** Hide PiP. Persistent until the visitor brings him back; he never reappears on his own. */
  dismiss() {
    const p = this.p(); p.hidden = true; this.savePersisted();
    this.clearBubble();
    this.set({ dismissed: true, mascot: "hidden" });
  }
  /** Bring PiP back, with a line about it. */
  restore() {
    const p = this.p(); p.hidden = false; this.savePersisted();
    this.set({ dismissed: false, mascot: "idle" });
    this.say("restore", { force: true, state: "celebrating", stateMs: 2500 });
  }
  isDismissed() { return this.p().hidden; }

  /** Temporarily set a mascot state, reverting to idle after `ms`. */
  setMascot(state: MascotState, ms?: number) {
    if (this.state.dismissed && state !== "hidden") return;
    clearTimeout(this.stateTimer);
    this.set({ mascot: state });
    if (ms) this.stateTimer = window.setTimeout(() => { if (this.state.mascot === state) this.set({ mascot: this.state.route === "/404" ? "lost" : "idle" }); }, ms);
  }

  /** Can a playful event fire right now? */
  private playful(): boolean {
    const s = this.state;
    return !s.formActive && !s.menuOpen && !s.gameOpen && !s.dismissed && !s.transitioning;
  }

  /** Has this key been said this session (or ever, for route keys)? */
  count(key: string) { return this.s().counts[key] ?? 0; }
  /** Count an event without speaking (e.g. a game invitation issued under a per-game key). */
  noteEvent(key: string) { const s = this.s(); s.counts[key] = (s.counts[key] ?? 0) + 1; s.last[key] = Date.now(); this.saveSession(); }
  /** True when the visitor has already heard every line in the category and none has expired. */
  exhausted(key: MessageKey) { return pickLine(linesFor(key), this.p().shown, Date.now()) === null; }
  isReturningVisitor() { return this.p().visits > 1; }

  /**
   * Ask to show a line for `key`. Returns true if shown. Applies priority,
   * per-key cooldowns, per-session caps, quiet-surface rules and, above
   * all, never repeats a line until the category is exhausted.
   */
  say(key: MessageKey, opts: { state?: MascotState; stateMs?: number; durationMs?: number; action?: Bubble["action"]; force?: boolean } = {}): boolean {
    const now = Date.now();
    const p = this.p();
    const s = this.s();
    const event = EVENT_KEYS.has(key) || key.startsWith("game.");
    if (this.state.dismissed && !opts.force) return false;
    if (!event && !opts.force && !this.playful()) return false;
    if (this.state.quiet && !event && !opts.force) return false;
    const cd = COOLDOWN[key];
    if (cd && !opts.force && isCoolingDown(s.last, key, now, cd)) return false;
    const cap = SESSION_MAX[key];
    if (cap && !opts.force && (s.counts[key] ?? 0) >= cap) return false;
    const priority = priorityOf(key);
    // Forced lines are explicit events (reconnect after offline, a game the visitor accepted) and replace whatever is showing.
    if (this.state.bubble && priority < this.currentPriority && !opts.force) return false;

    const pick = pickLine(linesFor(key), p.shown, now);
    if (!pick) return false; // Every line heard recently: stay silent rather than repeat.
    p.shown = recordShown(p.shown, pick.line.id, now);
    s.last[key] = now; s.counts[key] = (s.counts[key] ?? 0) + 1;
    this.savePersisted(); this.saveSession();

    clearTimeout(this.bubbleTimer);
    this.currentPriority = priority;
    const bubble: Bubble = { id: this.nextId++, text: pick.line.text, lineId: pick.line.id, key, action: opts.action };
    this.set({ bubble, mascot: this.state.dismissed ? "hidden" : (opts.state ?? this.state.mascot) });
    if (opts.state && !this.state.dismissed) this.setMascot(opts.state, opts.stateMs ?? 4000);
    const duration = opts.durationMs ?? (opts.action ? 12000 : Math.min(9000, 3500 + pick.line.text.length * 45));
    this.bubbleTimer = window.setTimeout(() => this.clearBubble(bubble.id), duration);
    return true;
  }

  /**
   * Hand a line to a caller that renders it itself (PiP's bench speaks in
   * its own scene, not from the corner). Same history, same rule: nothing
   * repeats until the category is exhausted, then silence until lines expire.
   */
  takeLine(key: MessageKey): PipLine | null {
    if (this.state.dismissed) return null;
    const now = Date.now();
    const p = this.p();
    const pick = pickLine(linesFor(key), p.shown, now);
    if (!pick) return null;
    p.shown = recordShown(p.shown, pick.line.id, now);
    this.savePersisted();
    return pick.line;
  }

  /** Route personality: one line per route per session, after the visitor has settled. */
  sayRoute(route: string): boolean {
    const key = Object.entries(ROUTE_KEYS).find(([prefix]) => route === prefix || route.startsWith(prefix + "/"))?.[1];
    if (!key) return false;
    const s = this.s();
    if (s.routeSaid[key]) return false;
    const ok = this.say(key, { state: "guiding", stateMs: 3000 });
    if (ok) { s.routeSaid[key] = Date.now(); this.saveSession(); }
    return ok;
  }

  clearBubble(id?: number) {
    if (id !== undefined && this.state.bubble?.id !== id) return;
    clearTimeout(this.bubbleTimer);
    this.currentPriority = 0;
    if (this.state.bubble) this.set({ bubble: null });
  }

  // ---------------------------------------------------------------- games
  /** Next game to offer, honouring rotation across sessions and visits. */
  nextGame(): GameId | null {
    const id = pickGame(GAME_IDS, this.p().games, { offered: this.s().offered });
    return (id as GameId | null) ?? null;
  }
  gameOffered(id: GameId) {
    const s = this.s(); if (!s.offered.includes(id)) s.offered.push(id); this.saveSession();
    const p = this.p(); p.games = recordGame(GAME_IDS, p.games, id, false); this.savePersisted();
  }
  gamePlayed(id: GameId) {
    const p = this.p(); p.games = recordGame(GAME_IDS, p.games, id, true); this.savePersisted();
  }
  gamesPlayedCount() { return this.p().games.played.length; }

  // ---------------------------------------------------------------- account sync
  /** Subscribe to persisted changes (debounced) so a signed-in account can keep a copy. */
  onSync(l: SyncListener) { this.syncListeners.add(l); return () => { this.syncListeners.delete(l); }; }
  snapshot(): Persisted { return this.p(); }
  /** Merge a copy stored on the account: union of heard lines, newest game history, hidden if either says so. */
  mergeRemote(remote: Partial<Persisted> | null | undefined) {
    if (!remote) return;
    const p = this.p();
    p.shown = mergeHistory(p.shown, remote.shown ?? {});
    if (remote.games && (remote.games.played.length + remote.games.offered.length) > (p.games.played.length + p.games.offered.length)) p.games = remote.games;
    if (remote.hidden !== undefined && remote.syncedAt && (!p.syncedAt || remote.syncedAt > p.syncedAt)) { p.hidden = remote.hidden; }
    write(local(), LOCAL_KEY, p);
    if (p.hidden !== this.state.dismissed) this.set({ dismissed: p.hidden, mascot: p.hidden ? "hidden" : "idle" });
  }
  /** Test helper: wipe everything. */
  resetForTests() {
    this.persisted = emptyPersisted(); this.sess = emptySession();
    write(local(), LOCAL_KEY, this.persisted); write(session(), SESSION_KEY, this.sess);
    this.clearBubble();
    this.set({ dismissed: false, mascot: "idle", quiet: false });
  }
}

export const behaviour = new BehaviourStore();

export function useBehaviour(): BehaviourState {
  return useSyncExternalStore(behaviour.subscribe, behaviour.get, behaviour.get);
}

/** Subscribe to just the route-transition flag, so consumers don't re-render on pointer moves. */
export function useTransitioning(): boolean {
  return useSyncExternalStore(behaviour.subscribe, () => behaviour.get().transitioning, () => false);
}
