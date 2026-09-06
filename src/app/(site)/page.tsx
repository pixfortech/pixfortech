import { Hero } from "@/components/hero/Hero";
import { CapabilitiesStrip } from "@/components/home/CapabilitiesStrip";
import { SelectedWork } from "@/components/home/SelectedWork";
import { Services } from "@/components/home/Services";
import { Manifesto } from "@/components/home/Manifesto";
import { ProcessPreview } from "@/components/home/ProcessPreview";
import { Technology } from "@/components/home/Technology";
import { FinalCta } from "@/components/home/FinalCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/content";

export const metadata = pageMetadata({
  title: `${site.name} | Web engineering and digital product studio`,
  description: site.description,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: site.name,
          url: site.url,
          description: site.description,
          email: site.email,
          knowsAbout: ["Website development", "Shopify development", "Web applications", "UI/UX design", "Web performance"],
        }}
      />
      <Hero />
      <CapabilitiesStrip />
      <SelectedWork />
      <Services />
      <Manifesto />
      <ProcessPreview />
      <Technology />
      <FinalCta />
    </>
  );
}
