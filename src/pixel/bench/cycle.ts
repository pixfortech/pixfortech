/**
 * Shuffled, non-repeating rotation for what PiP builds next. Every piece is
 * built once per cycle; when the cycle is spent the pool is reshuffled, and
 * the piece that closed one cycle never opens the next. The same philosophy
 * as PiP's lines and games, kept tiny and pure so it can be tested.
 */
export type CycleState = { queue: string[]; last: string | null };

export const emptyCycle = (): CycleState => ({ queue: [], last: null });

function shuffle<T>(list: readonly T[], rnd: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

export function nextObject(ids: readonly string[], state: CycleState, rnd: () => number = Math.random): { id: string; state: CycleState } {
  let queue = state.queue.filter((id) => ids.includes(id));
  if (queue.length === 0) {
    queue = shuffle(ids, rnd);
    if (queue.length > 1 && queue[0] === state.last) {
      const j = 1 + Math.floor(rnd() * (queue.length - 1));
      [queue[0], queue[j]] = [queue[j], queue[0]];
    }
  }
  const [id, ...rest] = queue;
  return { id, state: { queue: rest, last: id } };
}
