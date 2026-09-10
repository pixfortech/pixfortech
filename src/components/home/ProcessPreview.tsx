import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { process } from "@/lib/content";

export function ProcessPreview() {
  return (
    <section className="section-y border-t border-line" aria-labelledby="process-title">
      <Container>
        <SectionHeading
          eyebrow="Process"
          number="05"
          id="process-title"
          title={<>From &ldquo;I have an idea&rdquo; to &ldquo;yes, it actually works.&rdquo;</>}
          lead="Five stages, each ending in something written down that you can hold us to. Surprises are for birthdays, not handovers."
        />
        <ol className="mt-14 grid gap-px border border-line bg-line rounded-md overflow-hidden md:grid-cols-5 lg:mt-20">
          {process.map((stage, i) => (
            <Reveal as="li" key={stage.index} delay={i * 0.06} className="group relative bg-ink-900 p-6 sm:p-7 transition-colors duration-(--dur-base) hover:bg-ink-850">
              <div className="flex items-center justify-between mb-8">
                <span className="num text-[0.75rem] text-forge-400">{stage.index}</span>
                <span className="h-1.5 w-1.5 bg-line-strong transition-colors group-hover:bg-forge-500" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] uppercase">{stage.name}</h3>
              <p className="mt-3 font-medium text-bone-50">{stage.verb}</p>
              <p className="mt-3 text-[0.8125rem] leading-snug text-bone-400">{stage.summary}</p>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-10">
          <ArrowLink href="/process">How an engagement runs</ArrowLink>
        </Reveal>
      </Container>
    </section>
  );
}
