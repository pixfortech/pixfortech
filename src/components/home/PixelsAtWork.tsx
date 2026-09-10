import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BenchLoader } from "@/pixel/bench/BenchLoader";
import { copy } from "@content/microcopy";

/** The second section: PiP's bench beside the first main heading, where messy ideas become aligned ones. */
export function PixelsAtWork() {
  return (
    <section className="section-y" aria-labelledby="pixels-title">
      <Container>
        <SectionHeading
          eyebrow={copy.home.pixelsEyebrow}
          number="01"
          id="pixels-title"
          title={copy.home.pixelsTitle}
          lead={copy.home.pixelsLead}
          art={
            <div className="w-full lg:ml-auto lg:max-w-[34rem]" data-testid="bench-art">
              <BenchLoader />
              <p className="mt-4 max-w-[34rem] text-[0.8125rem] leading-snug text-bone-400">
                <span className="font-medium text-bone-200">{copy.home.benchEyebrow}.</span> {copy.home.benchLine}
              </p>
            </div>
          }
        />
      </Container>
    </section>
  );
}
