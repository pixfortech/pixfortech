// Generates original abstract "pixel forge" cover art as SVG for placeholder
// case studies. Deterministic per seed so output is stable in git.
import { writeFileSync, mkdirSync } from "node:fs";

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const palettes = [
  { bg: "#121215", cell: "#1c1c22", warm: ["#ff5a2c", "#ff7a4f", "#ffb08a"], cool: [] },
  { bg: "#111114", cell: "#1a1a1f", warm: ["#ff5a2c"], cool: ["#f4f1ea"] },
  { bg: "#121216", cell: "#1b1b21", warm: ["#ff5a2c", "#ff7a4f"], cool: ["#8b96ff", "#5560d6"] },
];

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
      if (heat > 0.62 && noise > 0.25) {
        const all = [...palette.warm, ...palette.cool];
        fill = all[Math.floor(r() * all.length)];
        op = 0.75 + r() * 0.25;
      } else if (heat > 0.3 && noise > 0.6) {
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
palettes.forEach((p, i) => {
  writeFileSync(`public/work/sample-0${i + 1}.svg`, cover(1000 + i * 77, p));
});
console.log("covers written");
