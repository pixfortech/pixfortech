import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Eyebrow({
  children,
  number,
  className,
  as: Tag = "p",
}: {
  children: ReactNode;
  number?: string;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  return (
    <Tag className={cn("eyebrow flex items-center gap-3", className)}>
      {number ? (
        <span className="num text-forge-400" aria-hidden="true">
          {number}
        </span>
      ) : (
        <span className="inline-block h-2 w-2 bg-forge-500" aria-hidden="true" />
      )}
      <span>{children}</span>
    </Tag>
  );
}
