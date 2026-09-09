"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry } from "../behaviours";
import type { GameProps } from "./GameHost";

/**
 * "Route the Spark": a 5x4 board of pipe tiles, each rotatable by a tap or
 * Enter. Build an unbroken path from the spark on the left edge (row 2) to
 * the anvil on the right edge. A solvable path is generated first, then
 * every tile is scrambled. 45 seconds.
 */
const COLS = 5, ROWS = 4;
const LIMIT_MS = 45_000;
/** Tile connections as a 4-bit mask: N=1, E=2, S=4, W=8. */
type Tile = { mask: number; fixed?: boolean };
const rotate = (m: number) => ((m << 1) & 15) | (m >> 3);

export function RouteTheSpark({ onResult, onStatus, theme, reducedMotion, seed }: GameProps) {
  const initial = useMemo(() => build(mulberry(seed + 23)), [seed]);
  const [tiles, setTiles] = useState<Tile[]>(initial.tiles);
  const [cursor, setCursor] = useState(0);
  const [moves, setMoves] = useState(0);
  const finished = useRef(false);
  const start = useRef(0);
  const lit = useMemo(() => reach(tiles), [tiles]);
  const connected = lit.has(initial.exit);

  useEffect(() => {
    if (!start.current) start.current = performance.now();
    const t = setInterval(() => {
      if (finished.current) return;
      const left = Math.max(0, Math.ceil((LIMIT_MS - (performance.now() - start.current)) / 1000));
      onStatus(`${moves} turns · ${left}s`);
      if (left <= 0) { finished.current = true; onResult("lose", "The spark fizzled."); }
    }, 250);
    return () => clearInterval(t);
  }, [moves, onResult, onStatus]);

  // Winning is a consequence of the tiles state; report it once, without touching state again.
  useEffect(() => {
    if (connected && !finished.current) { finished.current = true; const secs = Math.round((performance.now() - start.current) / 1000); onStatus(`${moves} turns`); onResult("win", `Routed in ${secs}s, ${moves} turns.`); }
  }, [connected, moves, onResult, onStatus]);

  const turn = (i: number) => {
    if (finished.current || tiles[i].fixed) return;
    setTiles((t) => t.map((tile, j) => (j === i ? { ...tile, mask: rotate(tile.mask) } : tile)));
    setMoves((m) => m + 1);
  };
  const onKey = (e: React.KeyboardEvent) => {
    let c = cursor;
    if (e.key === "ArrowRight") c = (c + 1) % (COLS * ROWS);
    else if (e.key === "ArrowLeft") c = (c - 1 + COLS * ROWS) % (COLS * ROWS);
    else if (e.key === "ArrowDown") c = (c + COLS) % (COLS * ROWS);
    else if (e.key === "ArrowUp") c = (c - COLS + COLS * ROWS) % (COLS * ROWS);
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(cursor); return; }
    else return;
    e.preventDefault(); setCursor(c);
  };

  return (
    <div className="pf-spark" data-testid="spark-board" data-connected={connected ? "true" : "false"}>
      <div className="pf-spark__end" aria-hidden="true" style={{ background: theme.accent }} title="Spark" />
      <div className="pf-grid pf-grid--spark" role="grid" aria-label="Pipe tiles. Arrow keys move, Enter rotates." tabIndex={0} onKeyDown={onKey} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {tiles.map((tile, i) => (
          <button key={i} type="button" role="gridcell" tabIndex={-1} aria-label={`Tile ${i + 1}${tile.fixed ? ", fixed" : ""}`} onClick={() => turn(i)} className={["pf-grid__cell pf-spark__tile", cursor === i && "pf-grid__cell--cursor", lit.has(i) && "pf-spark__tile--lit", tile.fixed && "pf-spark__tile--fixed"].filter(Boolean).join(" ")} style={{ transition: reducedMotion ? "none" : undefined }}>
            <Pipe mask={tile.mask} colour={lit.has(i) ? theme.accent : "rgba(244,241,234,0.45)"} />
          </button>
        ))}
      </div>
      <div className="pf-spark__end pf-spark__end--anvil" aria-hidden="true" style={{ background: connected ? theme.accent : theme.secondary }} title="Anvil" />
    </div>
  );
}

function Pipe({ mask, colour }: { mask: number; colour: string }) {
  return (
    <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
      <circle cx="10" cy="10" r="2.2" fill={colour} />
      {mask & 1 ? <rect x="8.5" y="0" width="3" height="10" fill={colour} /> : null}
      {mask & 2 ? <rect x="10" y="8.5" width="10" height="3" fill={colour} /> : null}
      {mask & 4 ? <rect x="8.5" y="10" width="3" height="10" fill={colour} /> : null}
      {mask & 8 ? <rect x="0" y="8.5" width="10" height="3" fill={colour} /> : null}
    </svg>
  );
}

/** Generates a random monotone-ish path from the left edge to the right edge, then scrambles all tiles. */
function build(rnd: () => number) {
  const tiles: Tile[] = Array.from({ length: COLS * ROWS }, () => ({ mask: 0 }));
  let r = 1 + Math.floor(rnd() * 2), c = 0;
  const path: number[] = [];
  const at = (rr: number, cc: number) => rr * COLS + cc;
  let steps = 0;
  while (c < COLS - 1 && steps++ < 40) {
    path.push(at(r, c));
    const move = rnd();
    if (move < 0.55 || r === 0 && move < 0.8 || r === ROWS - 1 && move < 0.8) c += 1;
    else if (move < 0.78 && r > 0 && !path.includes(at(r - 1, c))) r -= 1;
    else if (r < ROWS - 1 && !path.includes(at(r + 1, c))) r += 1;
    else c += 1;
  }
  path.push(at(r, c));
  const exit = at(r, c);
  const entry = path[0];
  // Connect consecutive cells
  const conn = (a: number, b: number) => {
    const ar = Math.floor(a / COLS), ac = a % COLS, br = Math.floor(b / COLS), bc = b % COLS;
    if (bc === ac + 1) { tiles[a].mask |= 2; tiles[b].mask |= 8; }
    else if (bc === ac - 1) { tiles[a].mask |= 8; tiles[b].mask |= 2; }
    else if (br === ar + 1) { tiles[a].mask |= 4; tiles[b].mask |= 1; }
    else if (br === ar - 1) { tiles[a].mask |= 1; tiles[b].mask |= 4; }
  };
  for (let i = 0; i < path.length - 1; i++) conn(path[i], path[i + 1]);
  tiles[entry].mask |= 8; // from the spark
  tiles[exit].mask |= 2; // to the anvil
  // Decoy pipes elsewhere, then scramble everything (never leave the solved orientation).
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].mask) tiles[i].mask = [3, 5, 10, 12, 6, 9][Math.floor(rnd() * 6)];
    const turns = 1 + Math.floor(rnd() * 3);
    let m = tiles[i].mask;
    for (let t = 0; t < turns; t++) m = rotate(m);
    if (m === tiles[i].mask && m !== 5 && m !== 10) m = rotate(m);
    tiles[i].mask = m;
  }
  return { tiles, entry, exit, entryRow: Math.floor(entry / COLS) };
}

/** Cells reachable from the spark through matching openings. */
function reach(tiles: Tile[]): Set<number> {
  const lit = new Set<number>();
  const queue: number[] = [];
  for (let r = 0; r < ROWS; r++) { const i = r * COLS; if (tiles[i].mask & 8) { lit.add(i); queue.push(i); } }
  while (queue.length) {
    const i = queue.shift()!;
    const r = Math.floor(i / COLS), c = i % COLS, m = tiles[i].mask;
    const step = (rr: number, cc: number, out: number, back: number) => {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
      const j = rr * COLS + cc;
      if (m & out && tiles[j].mask & back && !lit.has(j)) { lit.add(j); queue.push(j); }
    };
    step(r - 1, c, 1, 4); step(r, c + 1, 2, 8); step(r + 1, c, 4, 1); step(r, c - 1, 8, 2);
  }
  // The exit is "reached" only if it is lit and opens east.
  const reached = new Set<number>();
  for (const i of lit) reached.add(i);
  for (let r = 0; r < ROWS; r++) { const i = r * COLS + COLS - 1; if (lit.has(i) && !(tiles[i].mask & 2)) reached.delete(i); }
  return reached;
}
