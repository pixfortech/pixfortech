import { Container } from "./Container";
import { PageHeader } from "./PageHeader";
import { Blocks } from "./Blocks";

export function LegalPage({ eyebrow, title, updated, source }: { eyebrow: string; title: string; updated: string; source: string }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} compact lead={<span className="num text-small text-bone-400">Last updated {updated}</span>} />
      <Container className="section-y">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-3">
            <Blocks source={source} />
          </div>
        </div>
      </Container>
    </>
  );
}
