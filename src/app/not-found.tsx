import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Page not found", description: "The page you were looking for is not here.", path: "/404", noIndex: true });

export default function NotFound() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden border-b border-line">
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:radial-gradient(ellipse_at_50%_50%,black_10%,transparent_70%)]" aria-hidden="true" />
      <Container className="relative pt-32 pb-24">
        <Eyebrow className="mb-6">Error 404</Eyebrow>
        <h1 className="display max-w-[12ch]">This pixel is <span className="text-forge-500">unassigned.</span></h1>
        <p className="lead mt-8 max-w-[34rem]">The page you asked for does not exist or has moved. The address may be wrong, or the content may not be published yet.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/" size="lg" arrow>Back to home</Button>
          <Button href="/contact" size="lg" variant="secondary">Contact us</Button>
        </div>
      </Container>
    </section>
  );
}
