/**
 * What PiP builds at the bench: small original pixel pieces, each a handful
 * of cells on a tiny grid, described as rows of characters so the shapes are
 * readable in source. Nothing here is a logo. Fills map to the current page
 * theme at draw time so every piece is made of the same material as the site.
 *
 *   #  primary   +  accent   =  secondary   o  bone   .  empty
 *
 * `mode` decides how PiP assembles it: one pixel at a time, a row at a time
 * (bottom up), or module by module (each module is its own drawing, layered
 * on the same grid). `small` marks pieces simple enough for the phone layout.
 */
export type Fill = "primary" | "accent" | "secondary" | "bone";
export type ObjectCell = { x: number; y: number; f: Fill; m: number };
export type BuildMode = "pixel" | "row" | "module";
export type BenchObject = { id: string; name: string; w: number; h: number; mode: BuildMode; cells: ObjectCell[]; small: boolean };

const FILLS: Record<string, Fill> = { "#": "primary", "+": "accent", "=": "secondary", o: "bone" };

function parse(layers: string[][]): { w: number; h: number; cells: ObjectCell[] } {
  const cells: ObjectCell[] = [];
  let w = 0, h = 0;
  layers.forEach((rows, m) => {
    h = Math.max(h, rows.length);
    rows.forEach((row, y) => {
      w = Math.max(w, row.length);
      [...row].forEach((ch, x) => { const f = FILLS[ch]; if (f) cells.push({ x, y, f, m }); });
    });
  });
  return { w, h, cells };
}

function piece(id: string, name: string, mode: BuildMode, layers: string[][], small = false): BenchObject {
  const { w, h, cells } = parse(layers);
  return { id, name, w, h, mode, cells, small };
}

export const BENCH_OBJECTS: readonly BenchObject[] = [
  piece("browser", "a browser window", "row", [[
    "=======",
    "=o.o..=",
    "=.....=",
    "=.##..=",
    "=======",
  ]]),
  piece("cursor", "a cursor", "pixel", [[
    "o....",
    "oo...",
    "ooo..",
    "oooo.",
    "ooooo",
    ".oo..",
  ]], true),
  piece("button", "a button", "row", [[
    "#######",
    "##ooo##",
    "#######",
  ]]),
  piece("layout", "a responsive layout", "module", [
    ["===", "===", "===", "===", "==="],
    ["....++", "....++"],
    ["", "", "", "....##", "....##"],
  ]),
  piece("dashboard", "a small dashboard", "module", [
    ["", "", "", "", "======="],
    ["", "", "#", "#", ""],
    ["", "..+", "..+", "..+", ""],
    ["", "", "....#", "....#", ""],
    ["......+", "......+", "......+", "......+", ""],
  ]),
  piece("brackets", "code brackets", "pixel", [[
    ".#..#.",
    "#....#",
    "#.++.#",
    "#....#",
    ".#..#.",
  ]], true),
  piece("grid", "a grid", "pixel", [[
    "#.#.#",
    ".....",
    "#.+.#",
    ".....",
    "#.#.#",
  ]], true),
  piece("phone", "a phone screen", "row", [[
    "====",
    "=.o=",
    "=##=",
    "=#.=",
    "=..=",
    "====",
  ]], true),
  piece("nav", "a navigation tree", "module", [
    ["...+"],
    ["", "...=", ".=====", ".=.=.="],
    ["", "", "", "", ".#.#.#"],
  ]),
  piece("card", "an interface card", "row", [[
    "======",
    "=+...=",
    "=oo..=",
    "======",
  ]], true),
  piece("cube", "a digital cube", "module", [
    ["", "", "####", "####", "####"],
    ["..++++", ".++++."],
    ["", "", "....==", "....==", "....=="],
  ]),
  piece("nodes", "connected nodes", "pixel", [[
    "++..##",
    "++==##",
    "..=.=.",
    "..##..",
    "..##..",
  ]], true),
  piece("steps", "a stepped sculpture", "row", [[
    "..+..",
    ".###.",
    "#####",
  ]], true),
  piece("mark", "a forge mark", "pixel", [[
    ".....+",
    "####..",
    "#####.",
    "#####.",
    "#####.",
    "#####.",
  ]]),
];

export const OBJECT_IDS = BENCH_OBJECTS.map((o) => o.id);
export const SMALL_OBJECT_IDS = BENCH_OBJECTS.filter((o) => o.small).map((o) => o.id);
export const objectById = (id: string): BenchObject => BENCH_OBJECTS.find((o) => o.id === id) ?? BENCH_OBJECTS[0];

/**
 * Assembly order for a piece: bottom row first, left to right, so pieces grow
 * upward from the bench. Modules keep their declared order.
 */
export function buildOrder(o: BenchObject): ObjectCell[] {
  const cells = [...o.cells];
  if (o.mode === "module") return cells.sort((a, b) => a.m - b.m || b.y - a.y || a.x - b.x);
  return cells.sort((a, b) => b.y - a.y || a.x - b.x);
}

/**
 * Where a deliberately misplaced pixel could land: a neighbouring empty cell,
 * one step away horizontally. Returns candidates as [cellIndex, dx, dy].
 */
export function misplaceOptions(o: BenchObject, order: ObjectCell[]): Array<[number, number, number]> {
  const taken = new Set(o.cells.map((c) => `${c.x},${c.y}`));
  const out: Array<[number, number, number]> = [];
  order.forEach((c, i) => {
    for (const dx of [-1, 1]) if (!taken.has(`${c.x + dx},${c.y}`) && c.x + dx >= -1 && c.x + dx <= o.w) out.push([i, dx, 0]);
  });
  return out;
}
