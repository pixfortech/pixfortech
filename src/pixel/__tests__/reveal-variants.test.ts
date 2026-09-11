import { describe, expect, it } from "vitest";
import { drawsFront } from "../reveals";
import type { RevealVariant } from "../types";

describe("reveal variants", () => {
  it("draws the canvas forge front only for the left-to-right family", () => {
    // Horizontal and line reveals run along the same axis as the drawn front.
    expect(drawsFront("horizontal")).toBe(true);
    expect(drawsFront("line")).toBe(true);
    // Opacity/transform variants carry interactive content and must not clip or
    // draw a mismatched front.
    const noFront: RevealVariant[] = ["cluster", "card", "grid", "image", "snap", "minimal"];
    for (const v of noFront) expect(drawsFront(v)).toBe(false);
  });
});
