import Link from "next/link";
import { site } from "@/lib/content";
import { Monogram } from "@/components/ui/Logo";
import { LocalTime } from "./LocalTime";
import { nav } from "@/lib/navigation";

const secondary = [
  { href: "/process", label: "Process" },
  { href: "/technologies", label: "Technologies" },
  { href: "/careers", label: "Careers" },
];

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  const socials = Object.entries(site.social).filter(([, url]) => Boolean(url));
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-(--section-y) border-t border-line bg-ink-950 overflow-hidden">
      <div className="container-x pt-16 pb-8 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3 text-bone-50 rounded-xs" aria-label="Pixel Forge Technologies, home">
              <Monogram size={32} />
              <span className="font-display text-xl font-semibold tracking-[-0.02em]">Pixel Forge Technologies</span>
            </Link>
            <p className="mt-6 max-w-sm text-bone-400 text-small">
              A web engineering and digital product studio. We design and build websites, Shopify stores and web applications that are fast, maintainable and made to be used.
            </p>
            <div className="mt-8 flex flex-col gap-2 text-small">
              <a href={`mailto:${site.email}`} className="link-line w-fit text-bone-50">{site.email}</a>
              {site.phone && <a href={`tel:${site.phone}`} className="link-line w-fit text-bone-50">{site.phone}</a>}
              <LocalTime timezone={site.timezone} label={site.location ? `${site.location},` : "Studio time"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:col-start-7">
            <div>
              <h2 className="eyebrow mb-5">Navigate</h2>
              <ul className="flex flex-col gap-3 text-small">
                {nav.map((n) => (
                  <li key={n.href}><Link href={n.href} className="link-line text-bone-200 hover:text-bone-50">{n.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="eyebrow mb-5">Studio</h2>
              <ul className="flex flex-col gap-3 text-small">
                {secondary.map((n) => (
                  <li key={n.href}><Link href={n.href} className="link-line text-bone-200 hover:text-bone-50">{n.label}</Link></li>
                ))}
                {legal.map((n) => (
                  <li key={n.href}><Link href={n.href} className="link-line text-bone-200 hover:text-bone-50">{n.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h2 className="eyebrow mb-5">Elsewhere</h2>
              {socials.length ? (
                <ul className="flex flex-col gap-3 text-small">
                  {socials.map(([key, url]) => (
                    <li key={key}>
                      <a href={url} className="link-line capitalize text-bone-200 hover:text-bone-50" rel="me noopener" target="_blank">{key === "x" ? "X" : key}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-bone-600">Social profiles coming soon.</p>
              )}
            </div>
          </div>
        </div>

        {/* Oversized brand treatment */}
        <div className="relative mt-16 select-none sm:mt-24" aria-hidden="true">
          <div className="pixel-rule mb-6" />
          <p className="font-display font-bold leading-[0.8] tracking-[-0.05em] text-[clamp(3rem,12.6vw,12.5rem)] whitespace-nowrap text-bone-50/90">
            PIXEL<span className="text-forge-500">.</span>FORGE
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-[0.8125rem] text-bone-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.legalName}. All rights reserved.</p>
          <p className="num">Designed and engineered in-house.</p>
        </div>
      </div>
    </footer>
  );
}
