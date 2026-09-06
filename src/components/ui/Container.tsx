import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return <Tag className={cn("container-x", className)}>{children}</Tag>;
}
