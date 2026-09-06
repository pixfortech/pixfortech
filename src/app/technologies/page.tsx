import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaBand } from "@/components/ui/CtaBand";
import { getTechnologies, technologyGroups } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Technologies",
  description: "The stack Pixel Forge Technologies builds with: JavaScript, TypeScript, React, Next.js, Shopify and Liquid, Node.js, PHP, Laravel and WordPress.",
  path: "/technologies",
});

const rules = [
  { title: "Fit the team that will maintain it", body: "A stack is chosen for the people who will own the product after launch, not for what we feel like using this month." },
  { title: "Boring where it can be", body: "Well-understood tools with long support horizons. Novelty has to earn its place with a concrete benefit." },
  { title: "Fewer dependencies", body: "Every package and app is a future maintenance cost. We prefer a few hundred lines we understand to a plugin we do not." },
  { title: "Performance is architectural", body: "Rendering strategy, image pipeline and script budget are decided before the first component is built." },
];

export default function TechnologiesPage() {
  const techs = getTechnologies();
  return (
    <>
      <PageHeader
        eyebrow="Technologies"
        title={["Chosen, not", "collected."]}
        lead="This is the stack we actually build with. It is deliberately short. Everything on it has shipped in production work we are responsible for."
      />
      <section className="section-y" aria-label="Stack">
        <Container>
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {technologyGroups.map((g, gi) => (
              <Reveal key={g.key} delay={gi * 0.05}>
                <h2 className="eyebrow mb-6 border-b border-line pb-3">{g.label}</h2>
                <ul className="flex flex-col gap-6">
                  {techs.filter((t) => t.group === g.key).map((t) => (
                    <li key={t.slug}>
                      <h3 className="font-display text-xl font-semibold tracking-[-0.015em]">{t.name}</h3>
                      <p className="mt-1 text-small text-bone-400">{t.use}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-t border-line section-y bg-ink-950/50" aria-labelledby="rules-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><Eyebrow className="mb-5">How we choose</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="rules-heading" className="h2">Four rules for picking a stack.</h2></Reveal>
            </div>
            <ul className="grid gap-px border border-line bg-line rounded-md overflow-hidden sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {rules.map((r, i) => (
                <Reveal as="li" key={r.title} delay={i * 0.06} className="bg-ink-900 p-7">
                  <span className="num block text-[0.75rem] text-forge-400 mb-6">0{i + 1}</span>
                  <h3 className="font-display text-xl font-semibold tracking-[-0.015em]">{r.title}</h3>
                  <p className="mt-3 text-small text-bone-400">{r.body}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>
      <CtaBand title="Building on something else?" body="If your product runs on a platform not listed here, ask. We will say honestly whether we are the right team." />
    </>
  );
}
