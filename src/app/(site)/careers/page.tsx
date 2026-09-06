import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { careersIntro, getRoles, site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Careers",
  description: "Join Pixel Forge Technologies. Remote roles and internships in Shopify development, frontend engineering and design.",
  path: "/careers",
});

export default function CareersPage() {
  const roles = getRoles();
  const applyTo = site.email;
  return (
    <>
      <PageHeader eyebrow="Careers" title={["Learn the craft", "on real work."]} lead={careersIntro.body[0]} />

      <section className="section-y" aria-labelledby="values-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><Eyebrow number="01" className="mb-5">How we work</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="values-heading" className="h2">What it is like here.</h2></Reveal>
              <Reveal delay={0.1}><p className="mt-5 text-bone-400 max-w-prose">{careersIntro.body[1]}</p></Reveal>
            </div>
            <ul className="grid gap-px border border-line bg-line rounded-md overflow-hidden sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {careersIntro.values.map((v, i) => (
                <Reveal as="li" key={v.title} delay={i * 0.06} className="bg-ink-900 p-7">
                  <span className="num block text-[0.75rem] text-forge-400 mb-6">0{i + 1}</span>
                  <h3 className="font-display text-xl font-semibold tracking-[-0.015em]">{v.title}</h3>
                  <p className="mt-3 text-small text-bone-400">{v.body}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-t border-line section-y bg-ink-950/50" aria-labelledby="roles-heading">
        <Container>
          <Reveal><Eyebrow number="02" className="mb-5">Open roles</Eyebrow></Reveal>
          <Reveal delay={0.05}><h2 id="roles-heading" className="h2">Positions</h2></Reveal>
          <div className="mt-12 flex flex-col gap-6">
            {roles.length === 0 && (
              <p className="text-bone-400">No open roles right now. Open applications are always welcome.</p>
            )}
            {roles.map((r) => (
              <Reveal key={r.slug}>
                <article id={r.slug} className="rounded-md border border-line bg-ink-900 p-7 sm:p-9 scroll-mt-28">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-4"><Tag tone="hot">{r.type}</Tag><Tag>{r.location}</Tag><Tag>{r.team}</Tag></div>
                      <h3 className="h3">{r.title}</h3>
                      <p className="mt-3 text-bone-200 max-w-prose">{r.summary}</p>
                    </div>
                    <Button href={`mailto:${r.applyEmail ?? applyTo}?subject=${encodeURIComponent(`Application: ${r.title}`)}`} arrow>Apply by email</Button>
                  </div>
                  <div className="mt-10 grid gap-8 md:grid-cols-3">
                    <div>
                      <p className="eyebrow mb-3">You will</p>
                      <ul className="flex flex-col gap-2 text-small text-bone-200">
                        {r.responsibilities.map((x) => <li key={x} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-forge-500" aria-hidden="true" />{x}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="eyebrow mb-3">You have</p>
                      <ul className="flex flex-col gap-2 text-small text-bone-200">
                        {r.requirements.map((x) => <li key={x} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-line-strong" aria-hidden="true" />{x}</li>)}
                      </ul>
                    </div>
                    <div>
                      {r.niceToHave && (
                        <>
                          <p className="eyebrow mb-3">Nice to have</p>
                          <ul className="flex flex-col gap-2 text-small text-bone-200">
                            {r.niceToHave.map((x) => <li key={x} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-line-strong" aria-hidden="true" />{x}</li>)}
                          </ul>
                        </>
                      )}
                      {r.compensation && (
                        <>
                          <p className="eyebrow mb-3 mt-8">Compensation</p>
                          <p className="text-small text-bone-200">{r.compensation}</p>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
            <Reveal>
              <div className="rounded-md border border-dashed border-line-strong p-7 sm:p-9 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="h3">Open application</h3>
                  <p className="mt-2 text-bone-400 max-w-prose">Nothing fits but you think you belong here? Send a short note and a link to something you built.</p>
                </div>
                <Button href={`mailto:${applyTo}?subject=${encodeURIComponent("Open application")}`} variant="secondary" arrow>Write to us</Button>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
