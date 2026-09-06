import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#101013",
    theme_color: "#101013",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
