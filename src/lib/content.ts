/**
 * Content access layer.
 * All pages read content through these functions so the storage can be
 * swapped for a headless CMS without touching UI components.
 */
import { articles } from "../../content/articles";
import { roles, careersIntro } from "../../content/careers";
import { process } from "../../content/process";
import { projects } from "../../content/projects";
import { services } from "../../content/services";
import { site } from "../../content/site";
import { technologies, technologyGroups } from "../../content/technologies";
import type { Article, Project, Role, Service, Technology } from "../../content/types";

export { site, process, careersIntro, technologyGroups };
export type { Article, Project, Role, Service, Technology };

export function getServices(): Service[] {
  return services;
}

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function getProjects(opts: { featuredOnly?: boolean } = {}): Project[] {
  return projects.filter((p) => p.published && (!opts.featuredOnly || p.featured));
}

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug && p.published);
}

/** Projects that are real, approved and safe to expose to search engines. */
export function getIndexableProjects(): Project[] {
  return projects.filter((p) => p.published && !p.placeholder);
}

export function getNextProject(slug: string): Project | undefined {
  const list = getProjects();
  const i = list.findIndex((p) => p.slug === slug);
  if (i === -1 || list.length < 2) return undefined;
  return list[(i + 1) % list.length];
}

export function getArticles(): Article[] {
  return articles
    .filter((a) => a.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug && a.published);
}

export function getRoles(): Role[] {
  return roles.filter((r) => r.published);
}

export function getRole(slug: string): Role | undefined {
  return roles.find((r) => r.slug === slug && r.published);
}

export function getTechnologies(): Technology[] {
  return technologies;
}

export function getTechnology(slug: string): Technology | undefined {
  return technologies.find((t) => t.slug === slug);
}

export function technologyNames(slugs: string[]): string[] {
  return slugs.map((s) => getTechnology(s)?.name ?? s);
}
