import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/work/ProjectCard";
import { NextSlotCard } from "@/components/work/NextSlotCard";
import { getProjects } from "@/lib/content";

export function SelectedWork() {
  const projects = getProjects({ featuredOnly: true }).slice(0, 2);
  return (
    <section className="section-y border-t border-line" aria-labelledby="work-title">
      <Container>
        <SectionHeading
          eyebrow="Things we've forged"
          number="02"
          id="work-title"
          title={<>Real projects. No imaginary client logos required.</>}
          lead="A few things that made it out of the forge and into the real world."
        />
        <div className="mt-14 grid gap-x-8 gap-y-14 lg:grid-cols-2 lg:mt-20">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.05} className={i === 0 ? "lg:col-span-2" : ""}>
              <ProjectCard project={p} priority={i === 0} wide={i === 0} />
            </Reveal>
          ))}
          <Reveal delay={0.1}>
            <NextSlotCard className="h-full" />
          </Reveal>
        </div>
        <Reveal className="mt-14">
          <Button href="/work" variant="secondary" size="lg" arrow>
            See all the work
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
