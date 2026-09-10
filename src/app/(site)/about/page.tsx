import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PipScene } from "@/pixel/scenes/PipScene";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaBand } from "@/components/ui/CtaBand";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Monogram } from "@/components/ui/Logo";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/content";

export const metadata = pageMetadata({
  title: "About",
  description: "Pixel Forge Technologies is a web design and development studio in Kolkata, India, founded by Aman Rahul Chaurasia.",
  path: "/about",
});

const beliefs = [
  { title: "Design and engineering are one job", body: "Most digital products fail in the handoff. We do not have one. The people who decide how it looks are in the room with the people who decide how it works." },
  { title: "Small teams, senior review", body: "Every project has a small team that knows all of it, and every line of code and every screen is reviewed by someone senior before it ships." },
  { title: "Honest scoping", body: "If a Shopify theme will do, we will not sell you a headless build. If the answer is smaller than you expected, you will hear that first." },
  { title: "Maintainable by design", body: "We build as if we will not be around next year, so that you are never dependent on us. Clients stay because they want to." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader art={<PipScene kind="about" />}
        eyebrow="About"
        title={["A studio, not", "a supplier."]}
        lead="Pixel Forge Technologies is a young web design and development studio in Kolkata. We design and build websites, e-commerce and digital experiences for businesses that need them to work as well as they look. Ideally better."
      />

      <section className="section-y" aria-labelledby="name-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><Eyebrow number="01" className="mb-5">The name</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="name-heading" className="h2">Pixel. Forge.</h2></Reveal>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <Reveal delay={0.1} className="prose-pf">
                <p>
                  <strong>Pixel</strong> is the smallest unit of an interface. It stands for precision: grids, spacing, type, the details that decide whether a product feels considered or careless.
                </p>
                <p>
                  <strong>Forge</strong> is where raw material is turned into something useful under heat and pressure. It stands for the engineering: taking an idea, a brief or a half-working product and shaping it into something that holds up in production.
                </p>
                <p>The studio sits deliberately between the two. Precision without craft is decoration. Craft without precision is a prototype.</p>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-line section-y bg-ink-950/50" aria-labelledby="beliefs-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><Eyebrow number="02" className="mb-5">What we believe</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="beliefs-heading" className="h2">Four things we will not compromise on.</h2></Reveal>
            </div>
            <ul className="grid gap-px border border-line bg-line rounded-md overflow-hidden sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {beliefs.map((b, i) => (
                <Reveal as="li" key={b.title} delay={i * 0.06} className="bg-ink-900 p-7">
                  <span className="num block text-[0.75rem] text-forge-400 mb-6">0{i + 1}</span>
                  <h3 className="font-display text-xl font-semibold tracking-[-0.015em]">{b.title}</h3>
                  <p className="mt-3 text-small text-bone-400">{b.body}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-t border-line section-y" aria-labelledby="team-heading">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal><Eyebrow number="03" className="mb-5">The team</Eyebrow></Reveal>
              <Reveal delay={0.05}><h2 id="team-heading" className="h2">Designers who build. Engineers who care how it looks.</h2></Reveal>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <Reveal delay={0.1}>
                <div className="prose-pf">
                  <p>A small studio in Kolkata, working with designers and developers who care about the same details: the grid, the type, the loading time, the button someone will click twice.</p>
                  <p>Junior developers work on real client projects from the first week, with senior review on everything. It keeps the work honest and keeps us teaching.</p>
                </div>
                <div className="mt-10 rounded-md border border-line p-6" data-testid="founder-card">
                  <div className="flex items-center gap-3 text-bone-200"><Monogram size={20} /><span className="eyebrow">Founder</span></div>
                  <p className="mt-4 font-display text-xl font-semibold tracking-[-0.015em] text-bone-50">{site.founder.name}</p>
                  <p className="mt-1 text-small text-bone-400">{site.founder.role} · {site.location}</p>
                </div>
                <div className="mt-8"><ArrowLink href="/careers">Join the team</ArrowLink></div>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      <CtaBand title="Want to work with us?" />
    </>
  );
}
