import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

const principles = [
  { title: "Start with the problem", body: "Not the animation. Not the gradient. Not the technology stack." },
  { title: "Design with a reason", body: "If something is on the page, it should be able to explain why." },
  { title: "Build for real screens", body: "Not just the designer\u2019s 1440px monitor." },
  { title: "Test the weird stuff", body: "Tiny phones. Long names. Bad Wi-Fi. That button someone will absolutely click twice." },
];

export function Manifesto() {
  return (
    <section className="section-y border-t border-line bg-ink-950/50" aria-labelledby="manifesto-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <Reveal>
              <Eyebrow number="04" className="mb-6">The forge philosophy</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 id="manifesto-title" className="h2">
                Ideas are cheap. <span className="text-bone-400">Precise execution is where things get interesting.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lead mt-8 max-w-[34rem]">
                We sit between the rough idea and the finished digital product: the place where structure, design and engineering have to agree on something.
              </p>
              <p className="mt-5 max-w-[34rem] text-bone-300">
                That means asking awkward questions early, sweating the small stuff later, and refusing to add things just because every other website has them.
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
