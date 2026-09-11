import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/content";
import { ProjectStarter } from "@/components/enquiry/ProjectStarter";
import { PipScene } from "@/pixel/scenes/PipScene";

export function FinalCta() {
  return (
    <section className="relative section-y border-t border-line overflow-hidden" aria-labelledby="cta-title">
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:radial-gradient(ellipse_at_50%_100%,black_10%,transparent_65%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_120%,rgba(255,90,44,0.16),transparent_60%)]" aria-hidden="true" />
      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10 items-end">
          <div className="lg:col-span-7">
            <Reveal variant="line">
              <h2 id="cta-title" className="h1">
                Have something worth building?
                <span className="block text-forge-500">Let&rsquo;s give it coordinates.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lead mt-8 max-w-[34rem]">
                Bring us the idea: polished, half-formed, or currently living in a file called <code className="rounded-xs bg-ink-850 px-1.5 py-0.5 font-mono text-[0.85em] text-bone-50">final-final-v3-really-final</code>. We&rsquo;ll work out what belongs where.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 text-small text-bone-400">
                Prefer email? <a href={`mailto:${site.email}`} className="link-line text-bone-50">{site.email}</a>
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <PipScene kind="forge" className="mt-10 max-w-[22rem]" />
              <p className="mt-3 flex items-center gap-3 text-small text-bone-400"><span className="inline-block h-2 w-2 shrink-0 bg-forge-500" aria-hidden="true" /><span><span className="text-bone-200">PiP:</span> &ldquo;I&rsquo;ve cleared a space on the bench.&rdquo;</span></p>
            </Reveal>
          </div>
          <Reveal delay={0.1} variant="card" className="lg:col-span-5">
            <ProjectStarter />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
