/**
 * Pixel Forge hero scene.
 *
 * Hundreds of modular cubes begin scattered and assemble into an isometric
 * forged block carrying the Pixel Forge monogram. Cubes arrive hot and cool
 * to graphite; the monogram stays warm. The structure is physically
 * interactive: the pointer attracts nearby cubes (or repels them when it
 * moves fast), clicks and taps send a shockwave through the block, dragging
 * pulls cubes along and releasing lets them spring home. Scrolling past the
 * hero disassembles the structure again.
 *
 * Pure Canvas 2D. No WebGL, no dependencies. Cheap enough for phones.
 */

export type SceneOptions = {
  /** Grid size (n x n columns). Lower on small or low-power devices. */
  size: number;
  reducedMotion: boolean;
};

export type Cube = {
  gx: number; gy: number; gz: number;
  /** target screen-space (relative to anchor, unit scale) */
  tx: number; ty: number;
  /** scattered start (relative to anchor, unit scale) */
  sx: number; sy: number;
  /** angle offset for drift */
  drift: number;
  delay: number;
  hot: boolean;
  /** the single ember cube on the monogram */
  ember: boolean;
  /** cooling heat 0..1 */
  heat: number;
  depth: number;
  /** interaction displacement (unit scale) and velocity: springs back to 0 */
  ox: number; oy: number; ovx: number; ovy: number;
  /** one-off scatter phase: >0 while a cube is thrown out and returning */
  thrown: number;
};

const MONOGRAM: Array<[number, number]> = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [1, 2], [2, 2], [3, 2],
  [0, 3],
  [0, 4],
];
const MONOGRAM_HOT: [number, number] = [4, 4];

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sculpted height map: a wedge rising toward the back with a plateau for the monogram. */
function heightAt(x: number, y: number, n: number): number {
  const fx = x / (n - 1);
  const fy = y / (n - 1);
  const ridge = 1 + Math.round((fx * 0.55 + (1 - fy) * 0.45) * 3.2); // 1..4
  const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
  const cut = edge === 0 && (x + y) % 3 === 0 ? -1 : 0; // eroded rim
  return Math.max(1, ridge + cut);
}

export function buildCubes(n: number): Cube[] {
  const rnd = mulberry(1337 + n);
  const cubes: Cube[] = [];
  const mono = new Map<string, "warm" | "hot">();
  const off = Math.floor((n - 5) / 2);
  for (const [mx, my] of MONOGRAM) mono.set(`${mx + off},${my + off}`, "warm");
  mono.set(`${MONOGRAM_HOT[0] + off},${MONOGRAM_HOT[1] + off}`, "hot");

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const key = `${x},${y}`;
      const base = heightAt(x, y, n);
      const inMonoArea = x >= off && x < off + 5 && y >= off && y < off + 5;
      const h = inMonoArea ? Math.max(base, 3) : base;
      const monoKind = mono.get(key);
      const total = h + (monoKind ? 1 : 0);
      for (let z = 0; z < total; z++) {
        const isTopMono = monoKind && z === total - 1;
        const tx = (x - y);
        const ty = (x + y) * 0.5 - z;
        const ang = rnd() * Math.PI * 2;
        const rad = 9 + rnd() * 16;
        cubes.push({
          gx: x, gy: y, gz: z,
          tx, ty,
          sx: tx + Math.cos(ang) * rad,
          sy: ty + Math.sin(ang) * rad * 0.6 - 6,
          drift: rnd() * Math.PI * 2,
          delay: (z * 0.05 + (x + y) / (2 * n)) * 0.7 + rnd() * 0.35,
          hot: Boolean(isTopMono),
          ember: Boolean(isTopMono && monoKind === "hot"),
          heat: 0,
          depth: x + y + z * 0.001,
          ox: 0, oy: 0, ovx: 0, ovy: 0, thrown: 0,
        });
      }
    }
  }
  cubes.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy) || a.gz - b.gz);
  return cubes;
}

const GRAPHITE = { top: [58, 58, 68], left: [40, 40, 48], right: [29, 29, 36] } as const;
const HOT = { top: [255, 176, 138], left: [255, 122, 79], right: [224, 67, 26] } as const;
const WARM = { top: [255, 122, 79], left: [214, 74, 34], right: [160, 52, 22] } as const;

function mix(a: readonly number[], b: readonly number[], t: number): string {
  const r = a[0] + (b[0] - a[0]) * t;
  const g = a[1] + (b[1] - a[1]) * t;
  const bl = a[2] + (b[2] - a[2]) * t;
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

export type Pulse = { x: number; y: number; t: number; strength: number };

export type Interaction = {
  /** Pointer or touch position in canvas space. */
  x: number; y: number; active: boolean;
  /** Pointer speed in px/s, smoothed. Fast pointers repel instead of attract. */
  speed: number;
  /** True while a drag is in progress: cubes near the point follow it. */
  dragging: boolean;
  /** Shockwaves from clicks and taps. */
  pulses: Pulse[];
  /** Global scatter event 0..1 (1 = just triggered), decays. */
  scatter: number;
  /** Row wave (0..1) that sweeps the grid, from a hidden interaction. */
  wave: number;
};

export type FrameInput = {
  t: number; // seconds since start
  dt: number;
  width: number; height: number;
  anchorX: number; anchorY: number;
  unit: number;
  pointer: Interaction;
  scroll: number; // 0..1 fraction of hero scrolled away
};

/** Screen position of a cube, ignoring interaction offsets. Used for hit testing. */
export function cubeScreen(c: Cube, input: Pick<FrameInput, "anchorX" | "anchorY" | "unit">): [number, number] {
  return [input.anchorX + c.tx * input.unit, input.anchorY + c.ty * input.unit];
}

/** Finds the top-most cube under a point (within one unit). */
export function hitCube(cubes: Cube[], x: number, y: number, input: Pick<FrameInput, "anchorX" | "anchorY" | "unit">): Cube | null {
  let best: Cube | null = null; let bestD = Infinity;
  for (let i = cubes.length - 1; i >= 0; i--) {
    const c = cubes[i];
    const [cx, cy] = cubeScreen(c, input);
    const d = Math.hypot(x - cx, y - (cy + input.unit * 0.5));
    if (d < input.unit * 1.1 && d < bestD) { best = c; bestD = d; }
  }
  return best;
}

/** True when any cube is still displaced or heated; lets the host stop drawing when calm. */
export function isActive(cubes: Cube[], pointer: Interaction): boolean {
  if (pointer.pulses.length || pointer.scatter > 0.01 || pointer.wave > 0 || pointer.dragging) return true;
  for (let i = 0; i < cubes.length; i += 5) { const c = cubes[i]; if (c.heat > 0.01 || Math.abs(c.ox) + Math.abs(c.oy) > 0.01 || c.thrown > 0) return true; }
  return false;
}

export function drawScene(ctx: CanvasRenderingContext2D, cubes: Cube[], input: FrameInput, opts: SceneOptions) {
  const { width, height, anchorX, anchorY, unit, pointer, t, dt, scroll } = input;
  ctx.clearRect(0, 0, width, height);

  const introDur = 2.4;
  const intro = opts.reducedMotion ? 1 : t;
  const scrollT = easeInOutQuad(Math.min(1, Math.max(0, scroll)));
  const interactive = !opts.reducedMotion;

  // Parallax from pointer (whole structure), gentle.
  const px = pointer.active ? (pointer.x / width - 0.5) : 0;
  const py = pointer.active ? (pointer.y / height - 0.5) : 0;
  const parX = px * unit * 0.9;
  const parY = py * unit * 0.5;

  // Ground glow
  const glowR = unit * 9;
  const glow = ctx.createRadialGradient(anchorX + parX, anchorY + unit * 2 + parY, 0, anchorX + parX, anchorY + unit * 2 + parY, glowR);
  glow.addColorStop(0, `rgba(255,90,44,${(0.10 + pointer.scatter * 0.12) * (1 - scrollT)})`);
  glow.addColorStop(1, "rgba(255,90,44,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(anchorX - glowR + parX, anchorY - glowR + parY, glowR * 2, glowR * 2);

  // Advance pulses (shockwaves) and global events.
  for (let i = pointer.pulses.length - 1; i >= 0; i--) { pointer.pulses[i].t += dt; if (pointer.pulses[i].t > 1.1) pointer.pulses.splice(i, 1); }
  if (pointer.scatter > 0) pointer.scatter = Math.max(0, pointer.scatter - dt * 0.8);
  if (pointer.wave > 0) pointer.wave = Math.min(1.4, pointer.wave + dt * 0.9); if (pointer.wave > 1.35) pointer.wave = 0;

  const half = unit;          // half width of top rhombus
  const quarter = unit * 0.5; // half height of top rhombus
  const vert = unit;          // cube vertical edge
  const attractR = unit * 3.6;
  const repel = pointer.speed > 900;

  for (let i = 0; i < cubes.length; i++) {
    const c = cubes[i];
    let p = opts.reducedMotion ? 1 : Math.min(1, Math.max(0, (intro - c.delay) / (introDur * 0.55)));
    p = easeOutCubic(p);
    // Disassemble on scroll, staggered so the top peels first
    const peel = Math.min(1, Math.max(0, scrollT * 1.35 - (1 - c.gz / 6) * 0.35));
    p = p * (1 - peel);

    // Heat: arrives hot, cools; monogram stays warm; interaction reheats
    if (!opts.reducedMotion) {
      if (p > 0.98 && c.heat === 0 && intro < introDur + 2) c.heat = 1;
      c.heat = Math.max(0, c.heat - dt * 0.9);
    }

    const driftX = Math.cos(t * 0.35 + c.drift) * 0.35;
    const driftY = Math.sin(t * 0.28 + c.drift) * 0.25;
    const gx = c.sx + driftX + (c.tx - c.sx - driftX) * p;
    const gy = c.sy + driftY + (c.ty - c.sy - driftY) * p;

    const depthPar = 1 + (c.gz * 0.04);
    const baseX = anchorX + gx * unit + parX * depthPar;
    const baseY = anchorY + gy * unit + parY * depthPar;

    // ---- interaction physics (unit-space offsets with a spring home)
    let pointerHeat = 0;
    if (interactive && p > 0.9) {
      let fx = 0, fy = 0;
      if (pointer.active) {
        const dx = pointer.x - baseX, dy = pointer.y - (baseY + quarter);
        const d = Math.hypot(dx, dy);
        if (d < attractR) {
          const k = 1 - d / attractR;
          pointerHeat = k * 0.85;
          const dir = pointer.dragging ? 1 : repel ? -1 : 1;
          const g = pointer.dragging ? 1.9 : repel ? 1.3 : 0.55;
          fx += (dx / (d || 1)) * k * g * dir;
          fy += (dy / (d || 1)) * k * g * dir * 0.6;
        }
      }
      for (const pu of pointer.pulses) {
        const dx = baseX - pu.x, dy = (baseY + quarter) - pu.y;
        const d = Math.hypot(dx, dy) || 1;
        const front = pu.t * unit * 14;
        const band = Math.max(0, 1 - Math.abs(d - front) / (unit * 2.2));
        if (band > 0) { const s = band * pu.strength * (1 - pu.t * 0.8); fx += (dx / d) * s * 1.4; fy += (dy / d) * s * 0.9 - s * 0.9; pointerHeat = Math.max(pointerHeat, band * 0.9); }
      }
      if (pointer.scatter > 0 && c.thrown === 0 && pointer.scatter > 0.99) { c.thrown = 1; c.ovx += Math.cos(c.drift) * 2.2; c.ovy += Math.sin(c.drift) * 1.4 - 1.6; }
      if (pointer.wave > 0) {
        const rowT = pointer.wave * 1.2 - (c.gx + c.gy) / 22;
        if (rowT > 0 && rowT < 0.35) { fy -= (1 - rowT / 0.35) * 0.9; pointerHeat = Math.max(pointerHeat, 0.6); }
      }
      // spring integrate
      const stiffness = c.thrown > 0 ? 3.5 : 9;
      c.ovx += (fx - c.ox * stiffness) * dt * 6;
      c.ovy += (fy - c.oy * stiffness) * dt * 6;
      c.ovx *= 0.86; c.ovy *= 0.86;
      c.ox += c.ovx * dt * 6; c.oy += c.ovy * dt * 6;
      const lim = 2.8;
      if (c.ox > lim) c.ox = lim; if (c.ox < -lim) c.ox = -lim; if (c.oy > lim) c.oy = lim; if (c.oy < -lim) c.oy = -lim;
      if (c.thrown > 0) { c.thrown = Math.max(0, c.thrown - dt * 0.9); }
    } else if (!interactive && pointer.pulses.length && p > 0.9) {
      // Reduced motion: a tap only warms the cubes it hit, no movement.
      for (const pu of pointer.pulses) { const d = Math.hypot(baseX - pu.x, (baseY + quarter) - pu.y); if (d < unit * 4) pointerHeat = Math.max(pointerHeat, (1 - d / (unit * 4)) * (1 - pu.t)); }
    }

    const X = baseX + c.ox * unit * 0.45;
    const Y = baseY + c.oy * unit * 0.45;

    const scale = 0.35 + 0.65 * p;
    const alpha = 0.15 + 0.85 * p;
    const h = half * scale, q = quarter * scale, v = vert * scale;

    let palette: { top: readonly number[]; left: readonly number[]; right: readonly number[] } = GRAPHITE;
    let heat = Math.max(c.heat, pointerHeat);
    if (c.hot) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + c.gx * 0.7 + c.gy * 0.9);
      palette = WARM;
      heat = Math.max(heat, 0.25 + pulse * 0.35 + pointer.scatter * 0.4);
    }

    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(X, Y - q);
    ctx.lineTo(X + h, Y);
    ctx.lineTo(X, Y + q);
    ctx.lineTo(X - h, Y);
    ctx.closePath();
    ctx.fillStyle = mix(palette.top, HOT.top, heat);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(X - h, Y);
    ctx.lineTo(X, Y + q);
    ctx.lineTo(X, Y + q + v);
    ctx.lineTo(X - h, Y + v);
    ctx.closePath();
    ctx.fillStyle = mix(palette.left, HOT.left, heat);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(X + h, Y);
    ctx.lineTo(X, Y + q);
    ctx.lineTo(X, Y + q + v);
    ctx.lineTo(X + h, Y + v);
    ctx.closePath();
    ctx.fillStyle = mix(palette.right, HOT.right, heat);
    ctx.fill();

    if (p > 0.9) {
      ctx.strokeStyle = `rgba(244,241,234,${0.06 + heat * 0.25})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, Y - q);
      ctx.lineTo(X + h, Y);
      ctx.lineTo(X, Y + q);
      ctx.lineTo(X - h, Y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Shockwave rings, drawn once per pulse over the structure.
  if (interactive) {
    for (const pu of pointer.pulses) {
      const r = pu.t * unit * 14;
      ctx.strokeStyle = `rgba(255,138,92,${(1 - pu.t) * 0.35 * pu.strength})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(pu.x, pu.y, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
