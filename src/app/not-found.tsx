import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LineReveal, Rise } from "@/components/ui/Entrance";
import { LostPixels } from "@/pixel/LostPixels";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Page not found", description: "This page was never forged, wandered off, or is hiding exceptionally well.", path: "/404", noIndex: true });

export default function NotFound() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden border-b border-line" aria-labelledby="nf-title">
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:radial-gradient(ellipse_at_50%_50%,black_10%,transparent_70%)]" aria-hidden="true" />
      <Container className="relative pt-32 pb-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <Rise><Eyebrow className="mb-6">Error 404 · pixels missing</Eyebrow></Rise>
            <h1 id="nf-title" className="h1 max-w-[16ch]">
              <LineReveal lines={["We seem to have", "misplaced a few pixels."]} delay={0.1} />
            </h1>
            <Rise delay={0.35}>
              <p className="lead mt-8 max-w-[34rem]">
                This page was either never forged, wandered off, or is hiding exceptionally well. Pip has been looking. Pip has not been successful.
              </p>
            </Rise>
            <Rise delay={0.45}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button href="/" size="lg" arrow>Forge a path home</Button>
                <Button href="/work" size="lg" variant="secondary">See what actually exists</Button>
              </div>
            </Rise>
          </div>
          <Rise delay={0.3} className="lg:col-span-5">
            <LostPixels />
          </Rise>
        </div>
      </Container>
    </section>
  );
}
