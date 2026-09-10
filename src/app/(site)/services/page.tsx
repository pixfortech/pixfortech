import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PipScene } from "@/pixel/scenes/PipScene";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/ui/CtaBand";
import { Tag } from "@/components/ui/Tag";
import { Arrow } from "@/components/ui/Button";
import { getServices, technologyNames } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Services",
  description: "Website design and development, e-commerce, graphic design, website redesign, performance and integrations from Pixel Forge Technologies, Kolkata.",
  path: "/services",
});

export default function ServicesPage() {
  const services = getServices();
  return (
    <>
      <PageHeader art={<PipScene kind="services" />}
        eyebrow="Services"
        title={["Design and", "engineering.", "Same room."]}
        lead="Six things we are suspiciously good at. Each starts with the problem you bring and ends with something your team can run without us."
      />
      <section className="section-y" aria-label="All services">
        <Container>
          <div className="grid gap-px border border-line bg-line rounded-md overflow-hidden md:grid-cols-2">
            {services.map((s, i) => (
              <Reveal key={s.slug} as="div" delay={(i % 2) * 0.05} className="bg-ink-900">
                <Link href={`/services/${s.slug}`} className="group flex h-full flex-col p-7 transition-colors duration-(--dur-base) hover:bg-ink-850 sm:p-9">
                  <div className="flex items-center justify-between">
                    <span className="num text-[0.75rem] text-forge-400">{s.index}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-pill border border-line text-bone-400 transition-colors group-hover:border-forge-500 group-hover:text-forge-300"><Arrow /></span>
                  </div>
                  <h2 className="h3 mt-10 group-hover:text-forge-300 transition-colors">{s.title}</h2>
                  <p className="mt-4 text-bone-200 max-w-prose">{s.summary}</p>
                  <p className="mt-6 text-small text-bone-400"><span className="eyebrow mr-2 text-bone-600">Outcome</span>{s.outcome}</p>
                  <ul className="mt-auto flex flex-wrap gap-1.5 pt-8" aria-label="Technologies">
                    {technologyNames(s.technologies).map((t) => <li key={t}><Tag>{t}</Tag></li>)}
                  </ul>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand title="Not sure which one you need?" body="Describe the problem. We will tell you what it actually takes, even when the answer is smaller than you expected." />
    </>
  );
}
