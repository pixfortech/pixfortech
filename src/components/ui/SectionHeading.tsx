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
  /** Contained scene beside the title on large screens, between title and lead on small ones. */
  art?: ReactNode;
};

/** Standard section opener: numbered eyebrow, display title, optional lead in a split grid. */
export function SectionHeading({ eyebrow, number, title, lead, className, align = "split", level = "h2", id, art }: Props) {
  const Tag = level;
  return (
    <div className={cn("grid gap-6 lg:grid-cols-12 lg:gap-10", className)}>
      <div className={cn(art ? "min-w-0 lg:col-span-6 lg:row-start-1" : align === "split" ? "lg:col-span-7" : "lg:col-span-12")}>
        <Reveal>
          <Eyebrow number={number} className="mb-5">
            {eyebrow}
          </Eyebrow>
        </Reveal>
        <Reveal delay={0.05} variant="line">
          <Tag id={id} className={level === "h1" ? "h1" : "h2"}>
            {title}
          </Tag>
        </Reveal>
      </div>
      {art ? <div className="min-w-0 w-full lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-end">{art}</div> : null}
      {lead ? (
        <Reveal delay={0.1} variant="snap" className={cn(art ? "lg:col-span-6 lg:col-start-1 lg:row-start-2" : align === "split" ? "lg:col-span-4 lg:col-start-9 lg:self-end" : "lg:col-span-7")}>
          <div className="lead">{lead}</div>
        </Reveal>
      ) : null}
    </div>
  );
}
