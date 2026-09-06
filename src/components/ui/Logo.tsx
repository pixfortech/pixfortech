import { cn } from "@/lib/utils";

/**
 * Pixel Forge monogram: a 5x5 modular grid forming a "P" with one molten cell.
 * Original mark for this build; replace with official artwork if supplied.
 */
export function Monogram({ className, size = 28 }: { className?: string; size?: number }) {
  const cells: Array<[number, number, "ink" | "hot"]> = [
    [0, 0, "ink"], [1, 0, "ink"], [2, 0, "ink"], [3, 0, "ink"],
    [0, 1, "ink"], [4, 1, "ink"],
    [0, 2, "ink"], [1, 2, "ink"], [2, 2, "ink"], [3, 2, "ink"],
    [0, 3, "ink"],
    [0, 4, "ink"], [4, 4, "hot"],
  ];
  const u = 100 / 5;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      {cells.map(([x, y, k]) => (
        <rect
          key={`${x}-${y}`}
          x={x * u + 1}
          y={y * u + 1}
          width={u - 2}
          height={u - 2}
          rx={1.5}
          className={k === "hot" ? "fill-forge-500" : "fill-current"}
        />
      ))}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-semibold tracking-[-0.02em] leading-none whitespace-nowrap", className)}>
      Pixel Forge
    </span>
  );
}
