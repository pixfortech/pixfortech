/**
 * Pixel Forge hero scene.
 *
 * Hundreds of modular cubes begin scattered and assemble into an isometric
 * forged block carrying the Pixel Forge monogram. Cubes arrive hot and cool
 * to graphite; the monogram stays warm. Pointer movement adds parallax and
 * local heat; scrolling past the hero disassembles the structure again.
 *
 * Pure Canvas 2D. No WebGL, no dependencies. Cheap enough for phones.
 */

export type SceneOptions = {
  /** Grid size (n x n columns). Lower on small or low-power devices. */
  size: number;
  reducedMotion: boolean;
};

type Cube = {
  gx: number; gy: number; gz: number;
  /** target screen-space (relative to anchor, unit scale) */
  tx: number; ty: number;
  /** scattered start (relative to anchor, unit scale) */
  sx: number; sy: number;
  /** angle offset for drift */
  drift: number;
  delay: number;
  hot: boolean;
  /** cooling heat 0..1 */
  heat: number;
  depth: number;
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
      // Plateau where monogram sits so it reads cleanly
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
          heat: 0,
          depth: x + y + z * 0.001,
        });
      }
    }
  }
  // Painter's order: back to front, low to high
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

export type FrameInput = {
  t: number; // seconds since start
  dt: number;
  width: number; height: number;
  anchorX: number; anchorY: number;
  unit: number;
  pointer: { x: number; y: number; active: boolean };
  scroll: number; // 0..1 fraction of hero scrolled away
};

export function drawScene(ctx: CanvasRenderingContext2D, cubes: Cube[], input: FrameInput, opts: SceneOptions) {
  const { width, height, anchorX, anchorY, unit, pointer, t, dt, scroll } = input;
  ctx.clearRect(0, 0, width, height);

  const introDur = 2.4;
  const intro = opts.reducedMotion ? 1 : t;
  const scrollT = easeInOutQuad(Math.min(1, Math.max(0, scroll)));

  // Parallax from pointer (whole structure), gentle.
  const px = pointer.active ? (pointer.x / width - 0.5) : 0;
  const py = pointer.active ? (pointer.y / height - 0.5) : 0;
  const parX = px * unit * 0.9;
  const parY = py * unit * 0.5;

  // Ground glow
  const glowR = unit * 9;
  const glow = ctx.createRadialGradient(anchorX + parX, anchorY + unit * 2 + parY, 0, anchorX + parX, anchorY + unit * 2 + parY, glowR);
  glow.addColorStop(0, `rgba(255,90,44,${0.10 * (1 - scrollT)})`);
  glow.addColorStop(1, "rgba(255,90,44,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(anchorX - glowR + parX, anchorY - glowR + parY, glowR * 2, glowR * 2);

  const half = unit;          // half width of top rhombus
  const quarter = unit * 0.5; // half height of top rhombus
  const vert = unit;          // cube vertical edge

  for (let i = 0; i < cubes.length; i++) {
    const c = cubes[i];
    let p = opts.reducedMotion ? 1 : Math.min(1, Math.max(0, (intro - c.delay) / (introDur * 0.55)));
    p = easeOutCubic(p);
    // Disassemble on scroll, staggered so the top peels first
    const peel = Math.min(1, Math.max(0, scrollT * 1.35 - (1 - c.gz / 6) * 0.35));
    p = p * (1 - peel);

    // Heat: arrives hot, cools; monogram stays warm; pointer reheats
    if (!opts.reducedMotion) {
      if (p > 0.98 && c.heat === 0 && intro < introDur + 2) c.heat = 1;
      c.heat = Math.max(0, c.heat - dt * 0.9);
    }

    const driftX = Math.cos(t * 0.35 + c.drift) * 0.35;
    const driftY = Math.sin(t * 0.28 + c.drift) * 0.25;
    const gx = c.sx + driftX + (c.tx - c.sx - driftX) * p;
    const gy = c.sy + driftY + (c.ty - c.sy - driftY) * p;

    const depthPar = 1 + (c.gz * 0.04); // higher cubes move a touch more
    const X = anchorX + gx * unit + parX * depthPar;
    const Y = anchorY + gy * unit + parY * depthPar;

    // Pointer heat proximity
    let pointerHeat = 0;
    if (pointer.active && !opts.reducedMotion) {
      const dx = pointer.x - X, dy = pointer.y - Y;
      const d = Math.sqrt(dx * dx + dy * dy);
      pointerHeat = Math.max(0, 1 - d / (unit * 3.2)) * 0.8;
    }

    const scale = 0.35 + 0.65 * p;
    const alpha = 0.15 + 0.85 * p;
    const h = half * scale, q = quarter * scale, v = vert * scale;

    let palette: { top: readonly number[]; left: readonly number[]; right: readonly number[] } = GRAPHITE;
    let heat = Math.max(c.heat, pointerHeat);
    if (c.hot) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + c.gx * 0.7 + c.gy * 0.9);
      palette = WARM;
      heat = Math.max(heat, 0.25 + pulse * 0.35);
      ctx.fillStyle = mix(palette.top, HOT.top, heat);
    }

    ctx.globalAlpha = alpha;

    // Top face
    ctx.beginPath();
    ctx.moveTo(X, Y - q);
    ctx.lineTo(X + h, Y);
    ctx.lineTo(X, Y + q);
    ctx.lineTo(X - h, Y);
    ctx.closePath();
    ctx.fillStyle = mix(palette.top, HOT.top, heat);
    ctx.fill();

    // Left face
    ctx.beginPath();
    ctx.moveTo(X - h, Y);
    ctx.lineTo(X, Y + q);
    ctx.lineTo(X, Y + q + v);
    ctx.lineTo(X - h, Y + v);
    ctx.closePath();
    ctx.fillStyle = mix(palette.left, HOT.left, heat);
    ctx.fill();

    // Right face
    ctx.beginPath();
    ctx.moveTo(X + h, Y);
    ctx.lineTo(X, Y + q);
    ctx.lineTo(X, Y + q + v);
    ctx.lineTo(X + h, Y + v);
    ctx.closePath();
    ctx.fillStyle = mix(palette.right, HOT.right, heat);
    ctx.fill();

    // Hairline edge for crispness
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
}
