import { projects } from "../../content/projects";
import { resolveRouteTheme } from "./themes";
import type { PixelTheme } from "./types";

/** Theme for any internal path, including project pages with their own identity. */
export function themeForPath(pathname: string): PixelTheme {
  const m = pathname.match(/^\/work\/([^/]+)\/?$/);
  if (m) {
    const project = projects.find((p) => p.slug === m[1]);
    if (project?.pixelTheme) return project.pixelTheme;
  }
  return resolveRouteTheme(pathname);
}
