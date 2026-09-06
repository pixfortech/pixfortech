import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/**
 * Shared Open Graph image renderer. Uses system fonts available to the
 * ImageResponse runtime; keeps the composition on-brand without network fetches.
 */
export function renderOg({ title, eyebrow }: { title: string; eyebrow?: string }) {
  const cells: Array<[number, number, boolean]> = [
    [0, 0, false], [1, 0, false], [2, 0, false], [3, 0, false],
    [0, 1, false], [4, 1, false],
    [0, 2, false], [1, 2, false], [2, 2, false], [3, 2, false],
    [0, 3, false],
    [0, 4, false], [4, 4, true],
  ];
  const u = 14;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#101013",
          color: "#f4f1ea",
          fontFamily: "Helvetica, Arial, sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", position: "relative", width: u * 5, height: u * 5 }}>
            {cells.map(([x, y, hot]) => (
              <div key={`${x}${y}`} style={{ position: "absolute", left: x * u, top: y * u, width: u - 2, height: u - 2, background: hot ? "#ff5a2c" : "#f4f1ea", borderRadius: 2 }} />
            ))}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Pixel Forge Technologies</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
          {eyebrow && <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#ff7a4f" }}>{eyebrow}</div>}
          <div style={{ fontSize: title.length > 48 ? 56 : 72, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>{title}</div>
        </div>
        <div style={{ position: "absolute", right: 64, bottom: 64, display: "flex", gap: 6 }}>
          {[0.25, 0.4, 0.6, 0.8, 1].map((o, i) => (
            <div key={i} style={{ width: 18, height: 18, background: "#ff5a2c", opacity: o, borderRadius: 3 }} />
          ))}
        </div>
      </div>
    ),
    ogSize,
  );
}
