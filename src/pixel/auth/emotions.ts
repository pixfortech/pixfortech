/**
 * PiP's faces at the forge gate. Each emotion is the corner sprite's cells
 * with a few deliberate edits: brows, hands over the eyes, a peeking eye,
 * working arms. Everything stays on the 12x12 grid so PiP is still PiP.
 * The privacy poses remove the eye cells entirely: there is nothing to
 * read, which is the point.
 */
import { cellsFor, type Cell } from "../mascot/sprites";
import type { MascotState } from "../behaviour/store";

export type AuthEmotion =
  | "idle" | "curious" | "attentive" | "reading" | "thinking" | "privacy" | "peek" | "alarmed"
  | "amused" | "worried" | "error" | "success" | "goodbye" | "waiting" | "relieved" | "sleepy";

export const AUTH_EMOTIONS: readonly AuthEmotion[] = ["idle", "curious", "attentive", "reading", "thinking", "privacy", "peek", "alarmed", "amused", "worried", "error", "success", "goodbye", "waiting", "relieved", "sleepy"];

export type AuthCell = { id: string; x: number; y: number; k: Cell["k"] | "brow" | "hand" };

type Spec = {
  base: MascotState;
  look?: [number, number];
  brows?: "none" | "up" | "flat" | "worried" | "down" | "one";
  arms?: "keep" | "down" | "point" | "up" | "cover" | "wave" | "fold" | "hold";
  eyes?: "keep" | "covered" | "peek" | "closed" | "half";
  mouth?: "keep" | "smile" | "flat" | "frown" | "o" | "grin" | "neutral";
  ember?: "keep" | "off" | "high";
  fx?: "keep" | "none";
};

const SPEC: Record<AuthEmotion, Spec> = {
  idle: { base: "idle" },
  curious: { base: "curious", brows: "up" },
  attentive: { base: "guiding", arms: "point", mouth: "smile" },
  reading: { base: "idle", look: [-0.6, 0.8], mouth: "neutral" },
  thinking: { base: "idle", look: [0.7, -0.9], brows: "one", mouth: "flat", ember: "high" },
  privacy: { base: "idle", eyes: "covered", arms: "cover", mouth: "flat" },
  peek: { base: "idle", eyes: "peek", arms: "cover", mouth: "smile" },
  alarmed: { base: "curious", brows: "up", arms: "up", mouth: "o", ember: "high" },
  amused: { base: "idle", eyes: "half", mouth: "grin", brows: "one" },
  worried: { base: "idle", brows: "worried", mouth: "frown", look: [0.3, -0.4], ember: "off" },
  error: { base: "idle", brows: "down", mouth: "frown", ember: "off", look: [0, 0.6] },
  success: { base: "celebrating", ember: "high" },
  goodbye: { base: "guiding", arms: "wave", mouth: "smile", look: [0, 0.4] },
  waiting: { base: "idle", look: [0.8, -0.8], arms: "hold", mouth: "neutral" },
  relieved: { base: "idle", eyes: "closed", mouth: "smile", ember: "high" },
  sleepy: { base: "sleeping" },
};

const EYES: Array<[number, number]> = [[3, 5], [7, 5]];

export function authCells(emotion: AuthEmotion, look: [number, number] = [0.5, 0.5], frame = 0): AuthCell[] {
  const s = SPEC[emotion];
  let cells: AuthCell[] = cellsFor(s.base, s.look ?? look);
  const drop = (pred: (c: AuthCell) => boolean) => { cells = cells.filter((c) => !pred(c)); };
  const add = (id: string, x: number, y: number, k: AuthCell["k"]) => cells.push({ id, x, y, k });

  if (s.mouth && s.mouth !== "keep") {
    drop((c) => c.k === "mouth");
    const m: Record<string, Array<[number, number]>> = {
      neutral: [[5, 8], [6, 8]], flat: [[4, 8], [5, 8], [6, 8], [7, 8]], smile: [[4, 7], [5, 8], [6, 8], [7, 7]],
      grin: [[4, 7], [5, 8], [6, 8], [7, 7], [5, 7], [6, 7]], frown: [[4, 8], [5, 7], [6, 7], [7, 8]], o: [[5, 7], [6, 7], [5, 8], [6, 8]],
    };
    m[s.mouth].forEach(([x, y], i) => add(`m${i}`, x, y, "mouth"));
  }
  if (s.eyes && s.eyes !== "keep") {
    drop((c) => c.k === "eye" || c.k === "pupil" || c.k === "lid");
    if (s.eyes === "closed") EYES.forEach(([ex, ey], i) => { add(`ec${i}a`, ex, ey + 1, "eye"); add(`ec${i}b`, ex + 1, ey + 1, "eye"); });
    if (s.eyes === "half") EYES.forEach(([ex, ey], i) => { add(`eh${i}a`, ex, ey + 1, "eye"); add(`eh${i}b`, ex + 1, ey + 1, "eye"); add(`ep${i}`, ex + 1, ey + 1, "pupil"); });
    if (s.eyes === "covered" || s.eyes === "peek") {
      EYES.forEach(([ex, ey], i) => {
        for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) {
          // Peek: the right hand lifts off the top-right eye cell for one visible eye and one pupil.
          if (s.eyes === "peek" && i === 1 && dy === 0) continue;
          add(`h${i}${dx}${dy}`, ex + dx, ey + dy, "hand");
        }
      });
      if (s.eyes === "peek") { add("peekEye", 7, 5, "eye"); add("peekEye2", 8, 5, "eye"); add("peekPupil", 8, 5, "pupil"); }
    }
  }
  if (s.brows && s.brows !== "none") {
    const b: Record<string, Array<[number, number]>> = {
      up: [[3, 3], [4, 3], [7, 3], [8, 3]], flat: [[3, 4], [4, 4], [7, 4], [8, 4]], worried: [[4, 3], [3, 4], [7, 3], [8, 4]],
      down: [[3, 4], [4, 4], [7, 4], [8, 4]], one: [[7, 3], [8, 3]],
    };
    // Brows sit on body cells; drawn after the body they read as a darker line above the eyes.
    (b[s.brows] ?? []).forEach(([x, y], i) => add(`b${i}`, x, y, "brow"));
    if (s.brows === "down") { add("bd0", 5, 4, "brow"); add("bd1", 6, 4, "brow"); }
  }
  if (s.arms && s.arms !== "keep") {
    drop((c) => c.k === "arm" || c.id === "hL" || c.id === "hR" || c.id === "aR2");
    const a: Record<string, Array<[number, number, AuthCell["k"]]>> = {
      down: [[1, 6, "arm"], [10, 6, "arm"]],
      point: [[1, 6, "arm"], [10, 5, "arm"], [11, 5, "arm"]],
      up: [[1, 3, "arm"], [1, 4, "arm"], [10, 3, "arm"], [10, 4, "arm"]],
      cover: [[1, 5, "arm"], [2, 4, "hand"], [10, 5, "arm"], [9, 4, "hand"]],
      wave: frame % 2 ? [[1, 6, "arm"], [10, 4, "arm"], [11, 3, "hand"]] : [[1, 6, "arm"], [10, 4, "arm"], [10, 3, "hand"]],
      fold: [[1, 5, "arm"], [10, 5, "arm"], [3, 6, "arm"], [8, 6, "arm"]],
      hold: [[1, 5, "arm"], [10, 5, "arm"], [1, 4, "hand"], [10, 4, "hand"]],
    };
    a[s.arms].forEach(([x, y, k], i) => add(`a${i}`, x, y, k));
  }
  if (s.ember === "off") drop((c) => c.id === "em");
  if (s.ember === "high") { drop((c) => c.id === "em"); add("em", 10, 1, "ember"); }
  if (s.fx === "none") drop((c) => c.k === "fx");
  return cells;
}

/** Whether an emotion shows any readable eye: privacy poses must not. */
export const showsEyes = (cells: AuthCell[]) => cells.some((c) => c.k === "eye" || c.k === "pupil");
