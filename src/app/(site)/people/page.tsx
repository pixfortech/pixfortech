import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PipScene } from "@/pixel/scenes/PipScene";
import { CtaBand } from "@/components/ui/CtaBand";
import { pageMetadata } from "@/lib/seo";
import { listPublicProfiles } from "@/server/services/profile";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({ title: "People", description: "The people who forge the pixels at Pixel Forge Technologies.", path: "/people" });

export default async function PeoplePage() {
  const people = await listPublicProfiles();
  return (
    <>
      <PageHeader art={<PipScene kind="people" />} eyebrow="People" title={["The hands", "on the anvil."]} lead="Every published profile here belongs to someone who actually builds the work. No stock photos, no invented departments." compact />
      <Container className="py-16 sm:py-20">
        {people.length === 0 ? (
          <p className="max-w-[34rem] text-bone-400">Profiles are still being forged. The team is real; the pages are on their way. Until then, <Link href="/about" className="link-line text-bone-50">read about the studio</Link>.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.id}>
                <Link href={`/people/${p.slug}`} className="group flex items-center gap-4 rounded-lg border border-line bg-ink-850/60 p-4 transition-colors hover:border-bone-50">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-900 font-display text-[1.125rem] font-semibold text-forge-400">
                    {p.hasAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/avatar/${p.id}?v=${p.avatarVersion}`} alt="" width={56} height={56} className="h-full w-full object-cover" />
                    ) : p.name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-bone-50 group-hover:text-forge-300">{p.name}</span>
                    {p.title && <span className="block truncate text-[0.875rem] text-bone-400">{p.title}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
      <CtaBand title="Want to join them?" body="We hire people who like the craft more than the title." />
    </>
  );
}
