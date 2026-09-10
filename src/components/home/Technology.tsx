import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { getTechnologies, technologyGroups } from "@/lib/content";

export function Technology() {
  const techs = getTechnologies();
  return (
    <section className="section-y border-t border-line bg-ink-950/50" aria-labelledby="tech-title">
      <Container>
        <SectionHeading
          eyebrow="Technology"
          number="06"
          id="tech-title"
          title={<>Tools we know well enough to argue about.</>}
          lead="We use the tools that fit the job, not the ones that make the longest logo wall."
        />
        <div className="mt-14 grid gap-10 lg:mt-20 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {technologyGroups.map((g, gi) => {
            const list = techs.filter((t) => t.group === g.key);
            return (
              <Reveal key={g.key} delay={gi * 0.05}>
                <h3 className="eyebrow mb-5 border-b border-line pb-3">{g.label}</h3>
                <ul className="flex flex-col gap-3">
                  {list.map((t) => (
                    <li key={t.slug} className="group">
                      <p className="font-medium text-bone-50">{t.name}</p>
                      <p className="text-[0.8125rem] leading-snug text-bone-400">{t.use}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
        <Reveal className="mt-14 flex flex-col gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[28rem] font-display text-[1.25rem] font-semibold tracking-[-0.015em] text-bone-50">Technology is the toolbox. <span className="text-bone-400">The outcome is still the point.</span></p>
          <ArrowLink href="/technologies">How we choose a stack</ArrowLink>
        </Reveal>
      </Container>
    </section>
  );
}
