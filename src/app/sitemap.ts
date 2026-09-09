import type { MetadataRoute } from "next";
import { getArticles, getIndexableProjects, getServices, site } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = ["", "/work", "/services", "/about", "/process", "/technologies", "/insights", "/careers", "/contact", "/people", "/privacy", "/terms"];
  const entries: MetadataRoute.Sitemap = staticRoutes.map((p) => ({
    url: `${site.url}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/contact" || p === "/services" || p === "/work" ? 0.9 : 0.6,
  }));
  for (const s of getServices()) entries.push({ url: `${site.url}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 });
  for (const p of getIndexableProjects()) entries.push({ url: `${site.url}/work/${p.slug}`, lastModified: now, changeFrequency: "yearly", priority: 0.7 });
  for (const a of getArticles()) entries.push({ url: `${site.url}/insights/${a.slug}`, lastModified: new Date(a.date), changeFrequency: "yearly", priority: 0.5 });
  // Only published staff profiles are listed. Private and client accounts never appear here.
  try {
    const { listPublicProfiles } = await import("@/server/services/profile");
    for (const p of await listPublicProfiles()) entries.push({ url: `${site.url}/people/${p.slug}`, lastModified: new Date(p.avatarVersion), changeFrequency: "monthly", priority: 0.5 });
  } catch (err) { console.error("[sitemap] profiles unavailable", err); }
  return entries;
}
