"use client";

import Link from "next/link";
import Image from "next/image";
import { usePixel } from "@/pixel/PixelProvider";
import { Tag } from "@/components/ui/Tag";
import { Arrow } from "@/components/ui/Button";
import { technologyNames } from "@/lib/content";
import type { Project } from "@/lib/content";
import { cn } from "@/lib/utils";

export function ProjectCard({ project, priority = false, className, wide = false, headingLevel = "h3" }: { project: Project; priority?: boolean; className?: string; wide?: boolean; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const { preview } = usePixel();
  const enter = () => preview(project.pixelTheme);
  const leave = () => preview(null);
  return (
    <article className={cn("group relative", className)} onPointerEnter={enter} onPointerLeave={leave} onFocusCapture={enter} onBlurCapture={leave}>
      <Link href={`/work/${project.slug}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400">
        <div className={cn("relative overflow-hidden rounded-md border border-line bg-ink-850", wide ? "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]" : "aspect-[4/3]")}>
          <Image
            src={project.cover.src}
            alt={project.cover.alt}
            width={project.cover.width}
            height={project.cover.height}
            priority={priority}
            sizes={wide ? "(min-width: 1440px) 1360px, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
            className="h-full w-full object-cover transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.03]"
          />
          {project.placeholder && (
            <span className="absolute left-3 top-3 z-10">
              <Tag tone="hot">Sample layout</Tag>
            </span>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent to-transparent opacity-0 transition-opacity duration-(--dur-base) group-hover:opacity-100" aria-hidden="true" />
          <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-pill bg-bone-50 text-ink-950 opacity-0 translate-y-2 transition-[opacity,transform] duration-(--dur-base) ease-(--ease-out) group-hover:opacity-100 group-hover:translate-y-0" aria-hidden="true">
            <Arrow />
          </span>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <Heading className="h3 group-hover:text-forge-300 transition-colors duration-(--dur-fast)">{project.title}</Heading>
            <span className="num text-small text-bone-400">{project.year}</span>
          </div>
          <p className="text-small text-bone-400">
            <span className="text-bone-200">{project.client}</span> · {project.industry}
          </p>
          <p className="text-bone-200 max-w-prose">{project.outcome}</p>
        </div>
      </Link>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
        {technologyNames(project.technologies).slice(0, 5).map((t) => (
          <li key={t}><Tag>{t}</Tag></li>
        ))}
      </ul>
    </article>
  );
}
