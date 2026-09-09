import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rise } from "@/components/ui/Entrance";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/content";
import { getProfilePreview, getPublicProfile, resolveSlugRedirect } from "@/server/services/profile";
import { getSessionUser } from "@/server/auth/session";
import { validateSlug } from "@/lib/profile/identity";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(slugRaw: string, preview: boolean) {
  const slug = slugRaw.toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { profile: null, redirectTo: null, preview: false };
  const profile = await getPublicProfile(slug);
  if (profile) return { profile, redirectTo: null, preview: false };
  if (preview) {
    const own = await getProfilePreview(slug, await getSessionUser());
    if (own) return { profile: own, redirectTo: null, preview: true };
  }
  return { profile: null, redirectTo: await resolveSlugRedirect(slug), preview: false };
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const loaded = await load(slug, preview === "1");
  const profile = loaded.profile;
  if (!profile || loaded.preview) return pageMetadata({ title: profile ? `${profile.name} (preview)` : "Profile", description: "A Pixel Forge profile.", path: `/people/${slug}`, noIndex: true });
  const title = `${profile.name}${profile.title ? ` · ${profile.title}` : ""} | ${site.shortName}`;
  const description = profile.bio?.split("\n")[0].slice(0, 160) || `${profile.name} is part of the ${site.name} team.`;
  const meta = pageMetadata({ title, description, path: `/people/${profile.slug}`, type: "website" });
  if (profile.hasAvatar) {
    const image = absoluteUrl(`/api/avatar/${profile.id}?v=${profile.avatarVersion}`);
    meta.openGraph = { ...meta.openGraph, images: [{ url: image, alt: profile.name }] };
    meta.twitter = { ...meta.twitter, images: [image] };
  }
  return meta;
}

export default async function PersonPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { preview: previewParam } = await searchParams;
  const { profile, redirectTo, preview } = await load(slug, previewParam === "1");
  // Old addresses redirect permanently to the current one; only internal, validated slugs are ever used.
  if (!profile && redirectTo && validateSlug(redirectTo).ok) permanentRedirect(`/people/${redirectTo}`);
  if (!profile) notFound();
  if (profile.slug !== slug.toLowerCase()) permanentRedirect(`/people/${profile.slug}`);
  const previewBanner = preview ? <div className="border-b border-[#f0b35a]/40 bg-[#f0b35a]/10 px-4 py-2 text-center text-[0.8125rem] text-[#f5c98a]">Preview. This page is not published; only you can see it.</div> : null;
  const avatar = profile.hasAvatar ? `/api/avatar/${profile.id}?v=${profile.avatarVersion}` : null;
  const links = [
    profile.websiteUrl && { label: "Website", href: profile.websiteUrl },
    profile.linkedinUrl && { label: "LinkedIn", href: profile.linkedinUrl },
    profile.githubUrl && { label: "GitHub", href: profile.githubUrl },
  ].filter(Boolean) as { label: string; href: string }[];
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: absoluteUrl(`/people/${profile.slug}`),
    ...(profile.title ? { jobTitle: profile.title } : {}),
    ...(profile.bio ? { description: profile.bio.split("\n")[0] } : {}),
    ...(avatar ? { image: absoluteUrl(avatar) } : {}),
    worksFor: { "@type": "Organization", name: site.name, url: site.url },
    ...(links.length ? { sameAs: links.map((l) => l.href) } : {}),
  };
  return (
    <>
      {preview ? null : <JsonLd data={person} />}
      {previewBanner}
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
        <Container className="relative pt-32 pb-16 sm:pt-40 sm:pb-20">
          <Rise><Eyebrow className="mb-6">People · {site.shortName}</Eyebrow></Rise>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <Rise delay={0.1} className="lg:col-span-3">
              <div className="relative aspect-square w-40 overflow-hidden rounded-md border border-line bg-ink-850 sm:w-48" aria-hidden={!avatar}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={`Portrait of ${profile.name}`} className="h-full w-full object-cover" width={192} height={192} />
                ) : (
                  <span className="grid h-full w-full place-items-center font-display text-[3rem] font-semibold text-forge-400">{profile.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("")}</span>
                )}
                <span className="absolute right-2 bottom-2 h-2 w-2 bg-forge-500" aria-hidden="true" />
              </div>
            </Rise>
            <div className="min-w-0 lg:col-span-9">
              <Rise delay={0.15}><h1 className="h1">{profile.name}</h1></Rise>
              {profile.title && <Rise delay={0.2}><p className="lead mt-3 text-bone-200">{profile.title}</p></Rise>}
              {profile.bio && (
                <Rise delay={0.25}>
                  <div className="mt-8 max-w-[38rem] text-[1.0625rem] leading-relaxed text-bone-200">
                    {profile.bio.split(/\n{2,}/).map((para, i) => <p key={i} className={i ? "mt-4" : undefined}>{para}</p>)}
                  </div>
                </Rise>
              )}
              <Rise delay={0.3}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  {links.map((l) => (
                    <a key={l.label} href={l.href} rel="me noopener nofollow" target="_blank" className="inline-flex h-11 items-center rounded-pill border border-line-strong px-5 text-[0.9375rem] text-bone-50 hover:border-bone-50">{l.label}</a>
                  ))}
                  <Button href="/contact" size="md" variant="primary" arrow>Work with the team</Button>
                </div>
              </Rise>
            </div>
          </div>
        </Container>
      </header>
      <Container className="py-16">
        <p className="text-small text-bone-400">
          <Link href="/people" className="link-line text-bone-200">All people</Link> · <Link href="/about" className="link-line text-bone-200">About the studio</Link>
        </p>
      </Container>
    </>
  );
}
