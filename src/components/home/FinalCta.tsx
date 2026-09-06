import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/content";
import { ProjectStarter } from "@/components/enquiry/ProjectStarter";

export function FinalCta() {
  return (
    <section className="relative section-y border-t border-line overflow-hidden" aria-labelledby="cta-title">
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:radial-gradient(ellipse_at_50%_100%,black_10%,transparent_65%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_120%,rgba(255,90,44,0.16),transparent_60%)]" aria-hidden="true" />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10 items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <h2 id="cta-title" className="h1">
                Have something worth building?
                <span className="block text-forge-500">Let&rsquo;s forge it.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lead mt-8 max-w-[32rem]">
                Tell us what you are building. We reply within two working days with honest questions, not a sales deck.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 text-small text-bone-400">
                Prefer email? <a href={`mailto:${site.email}`} className="link-line text-bone-50">{site.email}</a>
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-5">
            <ProjectStarter />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
