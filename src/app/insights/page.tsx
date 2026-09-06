import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/ui/CtaBand";
import { Tag } from "@/components/ui/Tag";
import { Arrow } from "@/components/ui/Button";
import { getArticles } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Insights",
  description: "Practical writing from Pixel Forge Technologies on Shopify performance, design systems, accessibility and web engineering.",
  path: "/insights",
});

export default function InsightsPage() {
  const articles = getArticles();
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title={["Notes from", "the workbench."]}
        lead="Practical writing on the things we fix most often: slow storefronts, drifting design systems and accessibility bolted on a week before launch."
      />
      <section className="section-y" aria-label="Articles">
        <Container>
          <ul className="border-t border-line">
            {articles.map((a, i) => (
              <Reveal as="li" key={a.slug} delay={i * 0.04} className="border-b border-line">
                <Link href={`/insights/${a.slug}`} className="group grid gap-4 py-8 sm:grid-cols-12 sm:gap-8 sm:py-10">
                  <div className="flex items-center gap-4 sm:col-span-3 sm:flex-col sm:items-start sm:gap-3">
                    <Tag>{a.category}</Tag>
                    <time dateTime={a.date} className="num text-small text-bone-400">{formatDate(a.date)}</time>
                  </div>
                  <div className="sm:col-span-8">
                    <h2 className="h3 group-hover:text-forge-300 transition-colors">{a.title}</h2>
                    <p className="mt-3 text-bone-200 max-w-prose">{a.description}</p>
                    <p className="mt-4 text-small text-bone-400">{a.readingTime}</p>
                  </div>
                  <div className="hidden sm:col-span-1 sm:flex sm:items-start sm:justify-end">
                    <span className="flex h-9 w-9 items-center justify-center rounded-pill border border-line text-bone-400 transition-colors group-hover:border-forge-500 group-hover:text-forge-300"><Arrow /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
