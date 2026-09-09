import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PipScene } from "@/pixel/scenes/PipScene";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/ui/CtaBand";
import { ProjectCard } from "@/components/work/ProjectCard";
import { getProjects } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Work",
  description: "Selected websites, Shopify storefronts and web applications designed and engineered by Pixel Forge Technologies.",
  path: "/work",
});

export default function WorkPage() {
  const projects = getProjects();
  const hasPlaceholders = projects.some((p) => p.placeholder);
  return (
    <>
      <PageHeader art={<PipScene kind="work" />}
        eyebrow="Work"
        title={["Built to be", "used."]}
        lead={
          hasPlaceholders
            ? "Client case studies are being forged as we speak. The entries below are layout samples showing how each project will be told once it is approved."
            : "Websites, storefronts and applications we designed and engineered, told as product stories rather than screenshot galleries."
        }
      />
      <section className="section-y" aria-label="Projects">
        <Container>
          <div className="grid gap-x-8 gap-y-14 lg:grid-cols-2">
            {projects.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 2) * 0.05} className={i === 0 ? "lg:col-span-2" : ""}>
                <ProjectCard project={p} priority={i === 0} wide={i === 0} headingLevel="h2" />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand title="Want to be the next case study?" />
    </>
  );
}
