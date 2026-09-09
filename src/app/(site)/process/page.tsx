import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PipScene } from "@/pixel/scenes/PipScene";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaBand } from "@/components/ui/CtaBand";
import { process } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Process",
  description: "How a Pixel Forge Technologies engagement runs: discover, design, engineer, refine and launch, each with a written output.",
  path: "/process",
});

export default function ProcessPage() {
  return (
    <>
      <PageHeader art={<PipScene kind="process" />}
        eyebrow="Process"
        title={["Five stages.", "No surprises."]}
        lead="Every engagement follows the same shape, whether it is a Shopify theme or a custom application. Each stage ends with something written down that you can hold us to. We find that keeps everyone honest, us included."
      />
      <section className="section-y" aria-label="Stages">
        <Container>
          <ol className="flex flex-col">
            {process.map((st, i) => (
              <Reveal as="li" key={st.index} delay={0.03 * i} className="grid gap-8 border-t border-line py-12 lg:grid-cols-12 lg:py-16 last:border-b">
                <div className="lg:col-span-4">
                  <Eyebrow number={st.index} className="mb-5">Stage {st.index}</Eyebrow>
                  <h2 className="h2 uppercase">{st.name}</h2>
                  <p className="lead mt-4">{st.verb}</p>
                </div>
                <div className="lg:col-span-7 lg:col-start-6 grid gap-8 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-bone-200">{st.summary}</p>
                  </div>
                  <div>
                    <p className="eyebrow mb-3">Activities</p>
                    <ul className="flex flex-col gap-2 text-small text-bone-200">
                      {st.activities.map((a) => (
                        <li key={a} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-forge-500" aria-hidden="true" />{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-line p-5 self-start">
                    <p className="eyebrow mb-2">Output</p>
                    <p className="text-bone-50">{st.output}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>
      <section className="border-t border-line section-y bg-ink-950/50" aria-labelledby="working-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><Eyebrow className="mb-5">Working together</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="working-heading" className="h2">What it is like week to week.</h2></Reveal>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <Reveal delay={0.1} className="prose-pf">
                <p>You get a single point of contact who is also doing the work, a shared board with what is in progress, and a short written update every week. Decisions are recorded so nobody has to remember a call.</p>
                <p>Staging environments are available from the first build, so you see the real thing early rather than a presentation of it. Feedback goes straight into the board.</p>
                <p>After launch, we either hand over fully with documentation or continue on a monthly improvement arrangement. Both are fine. The code is yours either way.</p>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>
      <CtaBand title="Ready for stage one?" body="Discovery starts with a conversation. Tell us what you are trying to do." />
    </>
  );
}
