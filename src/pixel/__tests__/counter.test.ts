import { describe, expect, it } from "vitest";
import { estimatePagePixels, formatCompact, pixelsForged, scrollProgress } from "../counter";

describe("pixels forged counter", () => {
  const laptop = { viewportWidth: 1440, viewportHeight: 900, pageHeight: 6000, devicePixelRatio: 1, maxScrollProgress: 0 };
  const phone = { viewportWidth: 390, viewportHeight: 844, pageHeight: 9000, devicePixelRatio: 3, maxScrollProgress: 0 };

  it("estimates physical page pixels from CSS size and DPR", () => {
    expect(estimatePagePixels(laptop)).toBe(1440 * 6000);
    expect(estimatePagePixels(phone)).toBe(390 * 3 * 9000 * 3);
  });

  it("forges at least one viewport at load and all pixels at full scroll", () => {
    expect(pixelsForged(laptop)).toBe(1440 * 900);
    expect(pixelsForged({ ...laptop, maxScrollProgress: 1 })).toBe(1440 * 6000);
  });

  it("produces different totals on a high-density phone than on a laptop", () => {
    expect(pixelsForged({ ...phone, maxScrollProgress: 1 })).not.toBe(pixelsForged({ ...laptop, maxScrollProgress: 1 }));
    expect(pixelsForged({ ...phone, maxScrollProgress: 1 })).toBeGreaterThan(pixelsForged({ ...laptop, maxScrollProgress: 1 }));
  });

  it("scales with maximum scroll progress and never below the first viewport", () => {
    expect(pixelsForged({ ...laptop, maxScrollProgress: 0.5 })).toBe(1440 * 3000);
    expect(pixelsForged({ ...laptop, maxScrollProgress: 0.05 })).toBe(1440 * 900);
  });

  it("formats compact numbers elegantly", () => {
    expect(formatCompact(843_210)).toBe("843K");
    expect(formatCompact(12_847_392)).toBe("12.8M");
    expect(formatCompact(147_200_000)).toBe("147.2M");
    expect(formatCompact(12_000_000)).toBe("12M");
  });

  it("computes scroll progress with a short page as complete", () => {
    expect(scrollProgress(0, 900, 6000)).toBe(0);
    expect(scrollProgress(5100, 900, 6000)).toBe(1);
    expect(scrollProgress(0, 900, 800)).toBe(1);
  });
});
