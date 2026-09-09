import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/work/ProjectCard";
import { getProjects } from "@/lib/content";
import { BenchLoader } from "@/pixel/bench/BenchLoader";
import { copy } from "@content/microcopy";

export function SelectedWork() {
  const projects = getProjects({ featuredOnly: true }).slice(0, 3);
  const hasPlaceholders = projects.some((p) => p.placeholder);
  return (
    <section className="section-y" aria-labelledby="work-title">
      <Container>
        <SectionHeading
          eyebrow="Selected work"
          number="01"
          id="work-title"
          title={<>Products that earn their keep.</>}
          art={
            <div className="w-full lg:ml-auto lg:max-w-[34rem]" data-testid="bench-art">
              <BenchLoader />
              <p className="mt-4 max-w-[34rem] text-[0.8125rem] leading-snug text-bone-400">
                <span className="font-medium text-bone-200">{copy.home.benchEyebrow}.</span> {copy.home.benchLine}
              </p>
            </div>
          }
          lead={
            hasPlaceholders
              ? "Client case studies are being forged as we speak. Until they are approved, these sample layouts show how each project will be told."
              : "Storefronts, websites and applications we designed, engineered and still think about."
          }
        />
        <div className="mt-14 grid gap-x-8 gap-y-14 lg:grid-cols-2 lg:mt-20">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.05} className={i === 0 ? "lg:col-span-2" : ""}>
              <ProjectCard project={p} priority={i === 0} wide={i === 0} />
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-14">
          <Button href="/work" variant="secondary" size="lg" arrow>
            See what we forged
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
