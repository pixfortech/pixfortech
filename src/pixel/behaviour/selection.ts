/**
 * Pure line selection and rotation rules. No DOM, no storage: the store feeds
 * these functions its history and persists what they return.
 */
import type { PipLine } from "./messages";

/** When a line was last shown, keyed by line id. */
export type ShownHistory = Record<string, number>;

/** A line is eligible again only after the expiry period, and only once the whole category has been exhausted. */
export const LINE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

export type Pick = { line: PipLine; exhausted: false } | { line: PipLine; exhausted: true } | null;

/**
 * Picks an unseen line from the category. When every line has been shown:
 *  - lines older than `expiryMs` become eligible again (oldest first bias);
 *  - otherwise returns null, so the caller stays silent or tries another category.
 * Never returns the most recently shown line while any alternative exists.
 */
export function pickLine(list: readonly PipLine[], history: ShownHistory, now: number, rnd: () => number = Math.random, expiryMs = LINE_EXPIRY_MS): Pick {
  if (!list.length) return null;
  const unseen = list.filter((l) => history[l.id] === undefined);
  if (unseen.length) return { line: unseen[Math.floor(rnd() * unseen.length)], exhausted: false };
  const expired = list.filter((l) => now - history[l.id] >= expiryMs);
  if (!expired.length) return null;
  // Oldest first, so the rotation stays fair even after expiry.
  const oldest = [...expired].sort((a, b) => history[a.id] - history[b.id]);
  const window = oldest.slice(0, Math.max(1, Math.ceil(oldest.length / 2)));
  return { line: window[Math.floor(rnd() * window.length)], exhausted: true };
}

/** Records a line as shown and caps history size (oldest entries are dropped). */
export function recordShown(history: ShownHistory, id: string, now: number, cap = 600): ShownHistory {
  const next = { ...history, [id]: now };
  const keys = Object.keys(next);
  if (keys.length > cap) {
    keys.sort((a, b) => next[a] - next[b]);
    for (const k of keys.slice(0, keys.length - cap)) delete next[k];
  }
  return next;
}

/** Merges two histories, keeping the latest timestamp per line (used to reconcile local and server copies). */
export function mergeHistory(a: ShownHistory, b: ShownHistory): ShownHistory {
  const out: ShownHistory = { ...a };
  for (const [k, v] of Object.entries(b)) if (!(k in out) || v > out[k]) out[k] = v;
  return out;
}

/** Number of lines in the category the visitor has not heard yet. */
export function unseenCount(list: readonly PipLine[], history: ShownHistory): number {
  return list.filter((l) => history[l.id] === undefined).length;
}

// ---------------------------------------------------------------- games

/**
 * Game rotation. Excludes games offered or played this session and the last
 * game across visits; resets only when every game has been cycled through.
 */
export type GameHistory = { played: string[]; offered: string[]; last: string | null };

export function pickGame(all: readonly string[], history: GameHistory, session: { offered: string[] }, rnd: () => number = Math.random): string | null {
  if (!all.length) return null;
  const cycled = new Set([...history.played, ...history.offered]);
  let eligible = all.filter((g) => !cycled.has(g) && !session.offered.includes(g) && g !== history.last);
  if (!eligible.length) eligible = all.filter((g) => !cycled.has(g) && !session.offered.includes(g));
  if (!eligible.length) {
    // Everyone has had a turn: start a new cycle, still avoiding this session and the last game if possible.
    eligible = all.filter((g) => !session.offered.includes(g) && g !== history.last);
    if (!eligible.length) eligible = all.filter((g) => !session.offered.includes(g));
    if (!eligible.length) return null;
  }
  return eligible[Math.floor(rnd() * eligible.length)];
}

/** Marks a game as offered (and optionally played); a full cycle resets the history. */
export function recordGame(all: readonly string[], history: GameHistory, id: string, played: boolean): GameHistory {
  const offered = history.offered.includes(id) ? history.offered : [...history.offered, id];
  const playedList = played && !history.played.includes(id) ? [...history.played, id] : history.played;
  const next: GameHistory = { played: playedList, offered, last: id };
  const done = new Set([...next.played, ...next.offered]);
  if (all.every((g) => done.has(g))) return { played: [], offered: [], last: id };
  return next;
}
