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
    headline: s.headline,
    cta: s.cta,
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
          number="03"
          id="services-title"
          title={<>Things we&rsquo;re suspiciously good at.</>}
          lead="A short list because “we do everything” usually means nobody knows what the company actually does."
        />
        <Reveal className="mt-14 lg:mt-20">
          <ServicesList services={services} />
        </Reveal>
        <Reveal className="mt-12">
          <Button href="/services" variant="secondary" size="lg" arrow>
            Every service, explained
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
