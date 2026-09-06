// Slices a tall screenshot into segments for review. Usage: node scripts/slice.mjs file.png segmentHeight
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const [file, segStr] = process.argv.slice(2);
const seg = Number(segStr ?? 2400);
const b64 = readFileSync(file).toString("base64");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();
const { w, h } = await page.evaluate(async (src) => {
  const img = new Image(); img.src = "data:image/png;base64," + src; await img.decode();
  document.body.style.margin = "0"; document.body.appendChild(img);
  return { w: img.naturalWidth, h: img.naturalHeight };
}, b64);
await page.setViewportSize({ width: w, height: Math.min(h, 4000) });
let n = 0;
for (let y = 0; y < h; y += seg) {
  const buf = await page.screenshot({ clip: { x: 0, y, width: w, height: Math.min(seg, h - y) }, fullPage: true });
  writeFileSync(file.replace(/\.png$/, `-seg${n}.png`), buf); n++;
}
await browser.close();
console.log(`${n} segments`);
