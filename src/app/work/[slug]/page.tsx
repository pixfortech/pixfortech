import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { Tag } from "@/components/ui/Tag";
import { Arrow, Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getNextProject, getProject, getProjects, technologyNames } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return pageMetadata({
    title: project.title,
    description: project.summary,
    path: `/work/${project.slug}`,
    noIndex: project.placeholder,
  });
}

const order = ["context", "challenge", "objective", "strategy", "ux", "visual", "engineering", "responsive", "performance"] as const;

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const next = getNextProject(project.slug);
  const techs = technologyNames(project.technologies);

  return (
    <article>
      <header className="relative border-b border-line overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <Container className="relative pt-32 pb-12 sm:pt-40">
          <Breadcrumbs items={[{ name: "Work", path: "/work" }, { name: project.title, path: `/work/${project.slug}` }]} />
          {project.placeholder && (
            <p className="mt-8 inline-flex items-center gap-3 rounded-md border border-forge-500/40 bg-forge-500/10 px-4 py-3 text-small text-forge-300">
              <span className="h-2 w-2 bg-forge-500" aria-hidden="true" />
              Sample layout. This case study uses placeholder content and does not describe a real client engagement.
            </p>
          )}
          <Reveal y={10}>
            <h1 className="h1 mt-8 max-w-[18ch]">{project.title}</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lead mt-6 max-w-[40rem]">{project.summary}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
              <div><dt className="eyebrow mb-2">Client</dt><dd className="text-bone-50">{project.client}</dd></div>
              <div><dt className="eyebrow mb-2">Industry</dt><dd className="text-bone-50">{project.industry}</dd></div>
              <div><dt className="eyebrow mb-2">Services</dt><dd className="text-bone-50">{project.services.join(", ")}</dd></div>
              <div><dt className="eyebrow mb-2">Year</dt><dd className="num text-bone-50">{project.year}</dd></div>
            </dl>
          </Reveal>
        </Container>
      </header>

      <Container className="pt-8 sm:pt-12">
        <Reveal>
          <div className="overflow-hidden rounded-md border border-line bg-ink-850">
            <Image src={project.cover.src} alt={project.cover.alt} width={project.cover.width} height={project.cover.height} priority sizes="(min-width: 1440px) 1360px, 100vw" className="h-auto w-full" />
          </div>
        </Reveal>
      </Container>

      <Container className="section-y">
        <div className="grid gap-16 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow mb-4">Contents</p>
              <ol className="flex flex-col gap-2 text-small">
                {order.map((key, i) => (
                  <li key={key}>
                    <a href={`#${key}`} className="flex items-baseline gap-3 text-bone-400 hover:text-bone-50 transition-colors">
                      <span className="num text-[0.6875rem] text-forge-400">{String(i + 1).padStart(2, "0")}</span>
                      {project.sections[key].heading}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="eyebrow mb-3 mt-10">Technology</p>
              <ul className="flex flex-wrap gap-1.5">{techs.map((t) => <li key={t}><Tag>{t}</Tag></li>)}</ul>
            </div>
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            {order.map((key, i) => {
              const s = project.sections[key];
              return (
                <Reveal key={key} as="div" className="border-t border-line py-10 first:border-t-0 first:pt-0 sm:py-12">
                  <section id={key} className="scroll-mt-28 grid gap-6 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <Eyebrow number={String(i + 1).padStart(2, "0")} as="p">{s.heading}</Eyebrow>
                    </div>
                    <div className="sm:col-span-8 prose-pf">
                      {s.body.map((p, j) => <p key={j}>{p}</p>)}
                      {s.list && <ul>{s.list.map((it) => <li key={it}>{it}</li>)}</ul>}
                      {s.image && (
                        <Image src={s.image.src} alt={s.image.alt} width={s.image.width} height={s.image.height} className="mt-6 rounded-md border border-line" />
                      )}
                    </div>
                  </section>
                </Reveal>
              );
            })}

            <Reveal className="border-t border-line py-10 sm:py-12">
              <section id="results" className="scroll-mt-28 grid gap-6 sm:grid-cols-12">
                <div className="sm:col-span-4"><Eyebrow number="10" as="p">Results</Eyebrow></div>
                <div className="sm:col-span-8">
                  {project.results?.length ? (
                    <dl className="grid gap-6 sm:grid-cols-2">
                      {project.results.map((r) => (
                        <div key={r.label} className="rounded-md border border-line p-6">
                          <dd className="font-display text-4xl font-semibold tracking-[-0.02em] text-forge-400">{r.value}</dd>
                          <dt className="mt-2 text-small text-bone-400">{r.label}</dt>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-bone-400">
                      {project.placeholder
                        ? "Results are published only when the client has verified them. This sample carries none."
                        : "Results for this project are shared on request."}
                    </p>
                  )}
                </div>
              </section>
            </Reveal>
          </div>
        </div>
      </Container>

      {next && (
        <section className="border-t border-line" aria-label="Next project">
          <Container className="py-16 sm:py-24">
            <Link href={`/work/${next.slug}`} className="group flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow mb-4">Next project</p>
                <p className="h2 group-hover:text-forge-300 transition-colors">{next.title}</p>
              </div>
              <span className="inline-flex items-center gap-3 font-medium">Read the study <Arrow /></span>
            </Link>
          </Container>
        </section>
      )}
      <section className="border-t border-line">
        <Container className="py-16 sm:py-20 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="lead">Have a similar project?</p>
          <Button href="/contact" size="lg" arrow>Start a project</Button>
        </Container>
      </section>
    </article>
  );
}
