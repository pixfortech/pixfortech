import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { getServices, technologyNames } from "@/lib/content";
import { ServicesList } from "./ServicesList";

export function Services() {
  const services = getServices().map((s) => ({
    slug: s.slug,
    index: s.index,
    title: s.title,
    summary: s.summary,
    problem: s.problem,
    capability: s.capability,
    outcome: s.outcome,
    technologies: technologyNames(s.technologies),
  }));
  return (
    <section className="section-y border-t border-line" aria-labelledby="services-title">
      <Container>
        <SectionHeading
          eyebrow="Services"
          number="02"
          id="services-title"
          title={<>What we design and build.</>}
          lead="Each engagement starts with the problem, not the deliverable. These are the six things clients most often need from us."
        />
        <Reveal className="mt-14 lg:mt-20">
          <ServicesList services={services} />
        </Reveal>
        <Reveal className="mt-12">
          <Button href="/services" variant="secondary" size="lg" arrow>
            All services
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
