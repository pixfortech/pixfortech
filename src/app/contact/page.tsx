import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LineReveal, Reveal } from "@/components/ui/Reveal";
import { Suspense } from "react";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Start a project",
  description: "Tell Pixel Forge Technologies what you are building. A short project enquiry, answered within two working days.",
  path: "/contact",
});

const expectations = [
  { title: "A reply within two working days", body: "From a person who read your brief, with questions rather than a quote." },
  { title: "A scoping call if it makes sense", body: "Thirty minutes to understand the problem properly. No slides." },
  { title: "A written proposal", body: "What we would do, in what order, what it costs and what you get at each stage." },
];

export default function ContactPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <Container className="relative pt-32 pb-16 sm:pt-40 sm:pb-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <Reveal y={10}><Eyebrow className="mb-6">Start a project</Eyebrow></Reveal>
              <h1 className="h1"><LineReveal lines={["Tell us what", "you are building."]} delay={0.1} /></h1>
              <Reveal delay={0.35}>
                <p className="lead mt-8 max-w-[30rem]">Three short steps. We ask only what we need to give you a useful first reply.</p>
              </Reveal>
              <Reveal delay={0.45}>
                <ul className="mt-12 flex flex-col gap-6 border-t border-line pt-8">
                  {expectations.map((e, i) => (
                    <li key={e.title} className="grid grid-cols-[2.5rem_1fr] gap-3">
                      <span className="num text-[0.75rem] text-forge-400 pt-1">0{i + 1}</span>
                      <div>
                        <p className="font-medium text-bone-50">{e.title}</p>
                        <p className="text-small text-bone-400">{e.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-10 text-small text-bone-400">
                  Prefer email? <a href={`mailto:${site.email}`} className="link-line text-bone-50">{site.email}</a>
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.25} className="lg:col-span-7">
              <Suspense fallback={<div className="min-h-[28rem] rounded-lg border border-line bg-ink-850/70" aria-hidden="true" />}>
                <EnquiryForm email={site.email} />
              </Suspense>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
