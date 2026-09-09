import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimeProvider, useTimeAgo } from "../TimeProvider";
import { fmtDate } from "../primitives";

afterEach(() => vi.useRealTimers());

describe("server and browser display time", () => {
  it("keeps the first render identical even when hydration crosses a minute boundary", () => {
    vi.useFakeTimers();
    const renderedAt = Date.UTC(2026, 8, 9, 10);
    const createdAt = renderedAt - 89000;
    function Label() {
      return createElement("span", null, useTimeAgo()(createdAt));
    }
    const tree = () => createElement(TimeProvider, { renderedAt }, createElement(Label));
    vi.setSystemTime(renderedAt);
    const server = renderToString(tree());
    vi.setSystemTime(renderedAt + 45000);
    const browserFirstRender = renderToString(tree());
    expect(browserFirstRender).toBe(server);
    expect(server).toContain("1m ago");
  });

  it("formats stored calendar dates in UTC rather than the host timezone", () => {
    const spy = vi.spyOn(Date.prototype, "toLocaleDateString");
    expect(fmtDate(new Date("2026-09-09T00:00:00Z"), true)).toBe("9 Sept 2026");
    expect(spy).toHaveBeenCalledWith("en-GB", expect.objectContaining({ timeZone: "UTC" }));
    spy.mockRestore();
  });
});
