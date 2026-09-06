import { Container } from "./Container";
import { Button } from "./Button";
import { Reveal } from "./Reveal";

export function CtaBand({ title = "Have something worth building?", body = "Tell us what you are working on. A person replies within two working days.", cta = "Start a project" }: { title?: string; body?: string; cta?: string }) {
  return (
    <section className="border-t border-line section-y" aria-labelledby="cta-band-title">
      <Container>
        <Reveal>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[36rem]">
              <h2 id="cta-band-title" className="h2">{title} <span className="text-forge-500">Let&rsquo;s forge it.</span></h2>
              <p className="lead mt-5">{body}</p>
            </div>
            <Button href="/contact" size="lg" arrow className="shrink-0">{cta}</Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
