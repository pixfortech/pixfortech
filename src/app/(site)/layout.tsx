import { SiteChrome } from "@/components/layout/SiteChrome";
import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
