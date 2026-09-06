import { Button } from "@/components/ui/Button";
import { LineReveal, Rise } from "@/components/ui/Entrance";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ForgeCanvas } from "./ForgeCanvas";

export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      {/* Fine grid ground */}
      <div className="absolute inset-0 grid-lines opacity-70 [mask-image:radial-gradient(ellipse_at_70%_45%,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,90,44,0.06),transparent_55%)]" aria-hidden="true" />

      {/* Scene: full-bleed on desktop, top band on mobile */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[52svh] min-h-[22rem] lg:pointer-events-auto lg:inset-0 lg:h-auto lg:min-h-0">
        <ForgeCanvas className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-900 lg:hidden" aria-hidden="true" />
      </div>

      <div className="container-x relative">
        <div className="flex min-h-[100svh] flex-col justify-end pb-12 pt-[52svh] sm:pb-16 lg:justify-center lg:pb-24 lg:pt-32">
          <div className="max-w-[44rem] lg:max-w-[52rem]">
            <Rise>
              <Eyebrow className="mb-6">Web engineering & product studio</Eyebrow>
            </Rise>
            <h1 id="hero-title" className="display">
              <LineReveal lines={["We forge", "digital experiences."]} delay={0.15} />
            </h1>
            <Rise delay={0.35}>
              <p className="lead mt-7 max-w-[34rem]">
                Websites, Shopify stores and web applications, designed and engineered by the same people, to the pixel. Fast by default. Maintainable on purpose.
              </p>
            </Rise>
            <Rise delay={0.45}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button href="/contact" size="lg" arrow>
                  Start a project
                </Button>
                <Button href="/work" size="lg" variant="secondary">
                  See what we forged
                </Button>
              </div>
            </Rise>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-6 right-(--gutter) hidden items-center gap-3 lg:flex" aria-hidden="true">
        <span className="eyebrow">Scroll</span>
        <span className="block h-10 w-px bg-line-strong overflow-hidden">
          <span className="block h-1/2 w-full bg-forge-500 animate-[scrollcue_2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </span>
      </div>
    </section>
  );
}
