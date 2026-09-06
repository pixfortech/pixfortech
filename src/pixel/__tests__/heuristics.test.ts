import { describe, expect, it } from "vitest";
import { detectOscillation, isCoolingDown, pickIndex, shouldTriggerDwell, type ScrollSample } from "../behaviour/heuristics";

const vh = 800;
function swings(count: number, amplitudeVh: number, startT = 0, stepMs = 800): ScrollSample[] {
  const out: ScrollSample[] = [];
  for (let i = 0; i <= count; i++) out.push({ t: startT + i * stepMs, y: (i % 2) * amplitudeVh * vh + 2000 });
  return out;
}

describe("scroll oscillation detection", () => {
  it("ignores one or two reversals", () => {
    expect(detectOscillation(swings(2, 0.6), vh, 2000)).toBe(false);
  });
  it("detects repeated up/down swings with no net progress", () => {
    const s = swings(8, 0.6);
    expect(detectOscillation(s, vh, s[s.length - 1].t)).toBe(true);
  });
  it("ignores tiny jitters below the swing threshold", () => {
    const s = swings(12, 0.05);
    expect(detectOscillation(s, vh, s[s.length - 1].t)).toBe(false);
  });
  it("does not fire when the reader is making real progress", () => {
    const s: ScrollSample[] = [];
    for (let i = 0; i < 12; i++) s.push({ t: i * 800, y: i * 700 + (i % 2) * 300 });
    expect(detectOscillation(s, vh, 11 * 800)).toBe(false);
  });
  it("only considers samples inside the window", () => {
    const old = swings(8, 0.6, 0);
    expect(detectOscillation(old, vh, 60_000)).toBe(false);
  });
});

describe("dwell trigger", () => {
  const base = { msOnRoute: 80_000, interacted: true, formActive: false, dialogOpen: false, shownRecently: false };
  it("fires after the threshold when the visitor has interacted", () => {
    expect(shouldTriggerDwell(base)).toBe(true);
  });
  it("waits below threshold", () => expect(shouldTriggerDwell({ ...base, msOnRoute: 30_000 })).toBe(false));
  it("stays quiet while a form is active or a dialog is open", () => {
    expect(shouldTriggerDwell({ ...base, formActive: true })).toBe(false);
    expect(shouldTriggerDwell({ ...base, dialogOpen: true })).toBe(false);
  });
  it("requires interaction and respects cooldown", () => {
    expect(shouldTriggerDwell({ ...base, interacted: false })).toBe(false);
    expect(shouldTriggerDwell({ ...base, shownRecently: true })).toBe(false);
  });
});

describe("cooldowns and message picking", () => {
  it("reports cooling down inside the window only", () => {
    expect(isCoolingDown({ a: 1000 }, "a", 5000, 10_000)).toBe(true);
    expect(isCoolingDown({ a: 1000 }, "a", 20_000, 10_000)).toBe(false);
    expect(isCoolingDown({}, "a", 20_000, 10_000)).toBe(false);
  });
  it("avoids repeating the previous line when there is a choice", () => {
    expect(pickIndex(3, 1, () => 0.4)).toBe(2);
    expect(pickIndex(1, 0, () => 0.9)).toBe(0);
  });
});
