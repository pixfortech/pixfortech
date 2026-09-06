import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Rise } from "@/components/ui/Entrance";
import { Tag } from "@/components/ui/Tag";
import { Blocks } from "@/components/ui/Blocks";
import { JsonLd } from "@/components/seo/JsonLd";
import { Arrow, Button } from "@/components/ui/Button";
import { getArticle, getArticles } from "@/lib/content";
import { articleSchema, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  return pageMetadata({ title: a.title, description: a.description, path: `/insights/${a.slug}`, type: "article", publishedTime: a.date });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const all = getArticles();
  const idx = all.findIndex((x) => x.slug === a.slug);
  const next = all[(idx + 1) % all.length];

  return (
    <article>
      <JsonLd data={articleSchema({ title: a.title, description: a.description, path: `/insights/${a.slug}`, date: a.date, author: a.author.name })} />
      <header className="relative border-b border-line overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <Container className="relative pt-32 pb-12 sm:pt-40 sm:pb-16">
          <Breadcrumbs items={[{ name: "Insights", path: "/insights" }, { name: a.category, path: "/insights" }]} />
          <Rise><h1 className="h1 mt-8 max-w-[22ch]">{a.title}</h1></Rise>
          <Rise delay={0.1}><p className="lead mt-6 max-w-[40rem]">{a.description}</p></Rise>
          <Rise delay={0.15}>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-small">
              <div><dt className="eyebrow mb-1">Published</dt><dd><time dateTime={a.date} className="num text-bone-50">{formatDate(a.date)}</time></dd></div>
              <div><dt className="eyebrow mb-1">Author</dt><dd className="text-bone-50">{a.author.name} <span className="text-bone-400">· {a.author.role}</span></dd></div>
              <div><dt className="eyebrow mb-1">Reading time</dt><dd className="text-bone-50">{a.readingTime}</dd></div>
              <div><dt className="eyebrow mb-1">Topic</dt><dd><Tag>{a.category}</Tag></dd></div>
            </dl>
          </Rise>
        </Container>
      </header>
      <Container className="section-y">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-3">
            <Blocks source={a.body} />
          </div>
        </div>
      </Container>
      {next && next.slug !== a.slug && (
        <section className="border-t border-line" aria-label="Next article">
          <Container className="py-16 sm:py-20">
            <Link href={`/insights/${next.slug}`} className="group flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow mb-4">Read next</p>
                <p className="h3 max-w-[30ch] group-hover:text-forge-300 transition-colors">{next.title}</p>
              </div>
              <span className="inline-flex items-center gap-3 font-medium">Continue <Arrow /></span>
            </Link>
          </Container>
        </section>
      )}
      <section className="border-t border-line">
        <Container className="py-16 sm:py-20 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="lead">Dealing with this on your own product?</p>
          <Button href="/contact" size="lg" arrow>Talk to us</Button>
        </Container>
      </section>
    </article>
  );
}
