import { cellsFor, type Cell } from "../mascot/sprites";
import type { MascotState } from "../behaviour/store";
import type { Arms } from "./bench";

/**
 * PiP's bench poses: the corner sprite's face for a state, with the arms
 * replaced by working arms (carrying, tapping, pointing at the piece,
 * folded in satisfaction, brushing dust off). A blink swaps the eyes for the
 * closed pair without changing anything else.
 */
const ARMS: Record<Arms, Array<[number, number, Cell["k"]]>> = {
  down: [[1, 6, "arm"], [10, 6, "arm"]],
  carry: [[1, 6, "arm"], [10, 5, "arm"], [10, 4, "arm"]],
  tap: [[1, 6, "arm"], [10, 4, "arm"], [11, 3, "ember"]],
  point: [[1, 6, "arm"], [10, 5, "arm"], [11, 5, "arm"]],
  fold: [[1, 5, "arm"], [10, 5, "arm"], [3, 6, "arm"], [8, 6, "arm"]],
  up: [[1, 3, "arm"], [1, 4, "arm"], [10, 3, "arm"], [10, 4, "arm"]],
  dustA: [[1, 6, "arm"], [10, 6, "arm"], [8, 7, "arm"]],
  dustB: [[1, 6, "arm"], [10, 6, "arm"], [4, 7, "arm"]],
};

export function benchCells(state: MascotState, look: [number, number], arms: Arms, blink: boolean): Cell[] {
  let cells = cellsFor(state, look).filter((c) => c.k !== "arm" && !(c.k === "ember" && (c.id === "hL" || c.id === "hR" || c.id === "aR2")));
  ARMS[arms].forEach(([x, y, k], i) => cells.push({ id: `ba${i}`, x, y, k }));
  if (blink) {
    cells = cells.filter((c) => c.k !== "eye" && c.k !== "pupil" && c.k !== "lid");
    for (const [ex, ey] of [[3, 5], [7, 5]] as const) cells.push({ id: `bl${ex}`, x: ex, y: ey + 1, k: "eye" }, { id: `bl${ex}b`, x: ex + 1, y: ey + 1, k: "eye" });
  }
  return cells;
}
