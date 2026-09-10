// Generates original abstract "pixel forge" cover art as SVG for the public
// projects, in each project's own palette. Deterministic per seed so output
// is stable in git. No logos, no screenshots: the same material as the site.
import { writeFileSync, mkdirSync } from "node:fs";

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const palettes = {
  // Ganguram: saffron, gold and cream mithai tones over a warm, dark counter.
  ganguram: { bg: "#17110f", cell: "#2a1d18", warm: ["#e9a23b", "#f0b95c", "#ffd58a", "#ffe0a8", "#c9782a"], cool: ["#8a3a2e"], seed: 1885 },
  // SD18: seam red and whites on a night-match ink, cut like a pitch.
  sd18: { bg: "#0f1218", cell: "#1c2230", warm: ["#e63946", "#ff5a63", "#ff8a92", "#f4f1ea"], cool: ["#f4f1ea", "#3b4658"], seed: 1818 },
};

function cover(seed, palette, w = 1600, h = 1200) {
  const r = rng(seed);
  const cols = 32, rows = 24;
  const cw = w / cols, ch = h / rows;
  const cx = cols * (0.55 + r() * 0.15), cy = rows * (0.45 + r() * 0.15);
  let rects = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = (x + 0.5 - cx) / cols, dy = (y + 0.5 - cy) / rows;
      const d = Math.sqrt(dx * dx + dy * dy * 1.6);
      const heat = Math.max(0, 1 - d * 2.6) + (r() - 0.5) * 0.25;
      const noise = r();
      let fill = null, op = 1;
      if (heat > 0.55 && noise > 0.2) {
        const all = [...palette.warm, ...palette.cool];
        fill = all[Math.floor(r() * all.length)];
        op = 0.75 + r() * 0.25;
      } else if (heat > 0.25 && noise > 0.55) {
        fill = palette.cell; op = 1;
      } else if (noise > 0.93) {
        fill = palette.cell; op = 0.9;
      }
      if (fill) {
        const inset = 1.5;
        rects += `<rect x="${(x * cw + inset).toFixed(1)}" y="${(y * ch + inset).toFixed(1)}" width="${(cw - inset * 2).toFixed(1)}" height="${(ch - inset * 2).toFixed(1)}" fill="${fill}" opacity="${op.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Abstract modular composition">
<rect width="${w}" height="${h}" fill="${palette.bg}"/>
<g>${rects}</g>
</svg>`;
}

mkdirSync("public/work", { recursive: true });
for (const [name, p] of Object.entries(palettes)) writeFileSync(`public/work/${name}.svg`, cover(p.seed, p));
console.log("covers written");
