import type { MetadataRoute } from "next";
import { getArticles, getIndexableProjects, getServices, site } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/work", "/services", "/about", "/process", "/technologies", "/insights", "/careers", "/contact", "/privacy", "/terms"];
  const entries: MetadataRoute.Sitemap = staticRoutes.map((p) => ({
    url: `${site.url}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/contact" || p === "/services" || p === "/work" ? 0.9 : 0.6,
  }));
  for (const s of getServices()) entries.push({ url: `${site.url}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 });
  for (const p of getIndexableProjects()) entries.push({ url: `${site.url}/work/${p.slug}`, lastModified: now, changeFrequency: "yearly", priority: 0.7 });
  for (const a of getArticles()) entries.push({ url: `${site.url}/insights/${a.slug}`, lastModified: new Date(a.date), changeFrequency: "yearly", priority: 0.5 });
  return entries;
}
