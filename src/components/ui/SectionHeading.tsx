import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";
import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  number?: string;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  align?: "left" | "split";
  level?: "h1" | "h2";
  id?: string;
};

/** Standard section opener: numbered eyebrow, display title, optional lead in a split grid. */
export function SectionHeading({ eyebrow, number, title, lead, className, align = "split", level = "h2", id }: Props) {
  const Tag = level;
  return (
    <div className={cn("grid gap-6 lg:grid-cols-12 lg:gap-10", className)}>
      <div className={cn(align === "split" ? "lg:col-span-7" : "lg:col-span-12")}>
        <Reveal>
          <Eyebrow number={number} className="mb-5">
            {eyebrow}
          </Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <Tag id={id} className={level === "h1" ? "h1" : "h2"}>
            {title}
          </Tag>
        </Reveal>
      </div>
      {lead ? (
        <Reveal delay={0.1} className={cn(align === "split" ? "lg:col-span-4 lg:col-start-9 lg:self-end" : "lg:col-span-7")}>
          <div className="lead">{lead}</div>
        </Reveal>
      ) : null}
    </div>
  );
}
