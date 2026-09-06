import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Entrance";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { JsonLd } from "@/components/seo/JsonLd";
import { Faq } from "@/components/ui/Faq";
import { getService, getServices, getTechnology, process } from "@/lib/content";
import { pageMetadata, serviceSchema } from "@/lib/seo";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  return pageMetadata({ title: s.title, description: s.summary, path: `/services/${s.slug}` });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();
  const others = getServices().filter((o) => o.slug !== s.slug);
  const techs = s.technologies.map((t) => getTechnology(t)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const faqSchema = s.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;

  return (
    <article>
      <JsonLd data={[serviceSchema({ name: s.title, description: s.summary, path: `/services/${s.slug}` }), ...(faqSchema ? [faqSchema] : [])]} />
      <header className="relative border-b border-line overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <Container className="relative pt-32 pb-16 sm:pt-40 sm:pb-20">
          <Breadcrumbs items={[{ name: "Services", path: "/services" }, { name: s.title, path: `/services/${s.slug}` }]} />
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Rise><p className="num text-forge-400 text-small mb-4">{s.index}</p></Rise>
              <Rise><h1 className="h1 max-w-[16ch]">{s.title}</h1></Rise>
              <Rise delay={0.1}><p className="lead mt-6 max-w-[38rem]">{s.summary}</p></Rise>
              <Rise delay={0.15}><div className="mt-8"><Button href="/contact" size="lg" arrow>Discuss a project</Button></div></Rise>
            </div>
            <Rise delay={0.2} className="lg:col-span-3 lg:col-start-10">
              <p className="eyebrow mb-3">Technology</p>
              <ul className="flex flex-wrap gap-1.5">{techs.map((t) => <li key={t.slug}><Tag>{t.name}</Tag></li>)}</ul>
            </Rise>
          </div>
        </Container>
      </header>

      <section className="section-y" aria-label="Problem, capability and outcome">
        <Container>
          <div className="grid gap-px border border-line bg-line rounded-md overflow-hidden md:grid-cols-3">
            {[
              ["Problem", s.problem],
              ["Capability", s.capability],
              ["Outcome", s.outcome],
            ].map(([label, text], i) => (
              <Reveal key={label} as="div" delay={i * 0.06} className="bg-ink-900 p-7 sm:p-9">
                <Eyebrow number={`0${i + 1}`} className="mb-5">{label}</Eyebrow>
                <p className="text-bone-200">{text}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line section-y" aria-labelledby="approach">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal><Eyebrow className="mb-5">Approach</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="approach" className="h2">How we work on it.</h2></Reveal>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <Reveal delay={0.1}>
                <div className="prose-pf">{s.body.map((p, i) => <p key={i}>{p}</p>)}</div>
              </Reveal>
              <Reveal delay={0.15}>
                <h3 className="h3 mt-14 mb-6">What you get</h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {s.deliverables.map((d, i) => (
                    <li key={d} className="flex gap-4 rounded-md border border-line p-4 text-small">
                      <span className="num text-forge-400 text-[0.6875rem] pt-1">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-bone-200">{d}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-line section-y" aria-labelledby="tech-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal><Eyebrow className="mb-5">Technology</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="tech-heading" className="h2">The stack behind it.</h2></Reveal>
            </div>
            <ul className="grid gap-px border border-line bg-line rounded-md overflow-hidden sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {techs.map((t, i) => (
                <Reveal as="li" key={t.slug} delay={i * 0.04} className="bg-ink-900 p-6">
                  <p className="font-medium text-bone-50">{t.name}</p>
                  <p className="mt-1 text-small text-bone-400">{t.use}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-t border-line section-y" aria-labelledby="process-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal><Eyebrow className="mb-5">Process</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="process-heading" className="h2">Same five stages, every time.</h2></Reveal>
              <Reveal delay={0.1}><p className="mt-5 text-bone-400"><Link href="/process" className="link-line text-bone-50">Read how an engagement runs</Link></p></Reveal>
            </div>
            <ol className="flex flex-col lg:col-span-7 lg:col-start-6 border-t border-line">
              {process.map((st, i) => (
                <Reveal as="li" key={st.index} delay={i * 0.04} className="grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-5">
                  <span className="num text-forge-400 text-small">{st.index}</span>
                  <div>
                    <p className="font-display text-xl font-semibold tracking-[-0.015em]">{st.name}</p>
                    <p className="mt-1 text-small text-bone-400">{st.verb}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {s.faqs.length > 0 && (
        <section className="border-t border-line section-y" aria-labelledby="faq-heading">
          <Container>
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <Reveal><Eyebrow className="mb-5">Questions</Eyebrow></Reveal>
                <Reveal delay={0.05}><h2 id="faq-heading" className="h2">Asked often.</h2></Reveal>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <Reveal delay={0.1}><Faq items={s.faqs} /></Reveal>
              </div>
            </div>
          </Container>
        </section>
      )}

      <section className="border-t border-line" aria-label="Other services">
        <Container className="py-16 sm:py-20">
          <p className="eyebrow mb-6">Other services</p>
          <ul className="flex flex-wrap gap-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/services/${o.slug}`} className="inline-flex h-11 items-center rounded-pill border border-line px-5 text-small text-bone-200 transition-colors hover:border-bone-50 hover:text-bone-50">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </article>
  );
}
