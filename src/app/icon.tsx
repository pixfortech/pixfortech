import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Favicon / app icon: the Pixel Forge monogram on graphite. */
export default function Icon() {
  const cells: Array<[number, number, boolean]> = [
    [0, 0, false], [1, 0, false], [2, 0, false], [3, 0, false],
    [0, 1, false], [4, 1, false],
    [0, 2, false], [1, 2, false], [2, 2, false], [3, 2, false],
    [0, 3, false],
    [0, 4, false], [4, 4, true],
  ];
  const pad = 96;
  const u = (512 - pad * 2) / 5;
  return new ImageResponse(
    (
      <div style={{ width: 512, height: 512, background: "#101013", display: "flex", position: "relative", borderRadius: 96 }}>
        {cells.map(([x, y, hot]) => (
          <div
            key={`${x}${y}`}
            style={{
              position: "absolute",
              left: pad + x * u + 4,
              top: pad + y * u + 4,
              width: u - 8,
              height: u - 8,
              background: hot ? "#ff5a2c" : "#f4f1ea",
              borderRadius: 6,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
