import Link from "next/link";
import { cn } from "@/lib/utils";
import { Arrow } from "./Button";
import type { ReactNode } from "react";

export function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 font-medium text-bone-50 hover:text-forge-300 transition-colors duration-(--dur-fast)", className)}>
      <span className="link-line">{children}</span>
      <Arrow />
    </Link>
  );
}
