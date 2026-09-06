import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

const principles = [
  { title: "Structure before surface", body: "Hierarchy, content and states are decided before colour. A beautiful interface that hides what people came for has failed." },
  { title: "Fast is a feature", body: "Speed is decided in architecture, not in a final optimisation pass. We set a budget and design within it." },
  { title: "Built to be handed over", body: "Code someone else can read, content someone else can edit, and documentation someone else will actually use." },
  { title: "Fewer things, done properly", body: "One well-made storefront beats three approximations. We say no to features that do not earn their weight." },
];

export function Manifesto() {
  return (
    <section className="section-y border-t border-line bg-ink-950/50" aria-labelledby="manifesto-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <Reveal>
              <Eyebrow number="03" className="mb-6">How we think</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 id="manifesto-title" className="h2">
                Pixels are a unit of precision. A forge is where raw material becomes something useful. <span className="text-bone-400">We sit exactly between the two.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lead mt-8 max-w-[34rem]">
                Digital products fail in the gap between design and engineering: screens that cannot be built, builds that ignore the design, and nobody owning the result. We close that gap by doing both, in the same room, for the same outcome.
              </p>
            </Reveal>
          </div>
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:col-span-6 lg:col-start-7 rounded-md overflow-hidden">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.06} className="bg-ink-900 p-7 sm:p-8">
                <span className="num block text-[0.75rem] text-forge-400 mb-6">0{i + 1}</span>
                <h3 className="font-display text-xl font-semibold tracking-[-0.015em] mb-3">{p.title}</h3>
                <p className="text-small text-bone-400">{p.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
