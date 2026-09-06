import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { PixelProvider } from "@/pixel/PixelProvider";
import { PixelUi } from "@/pixel/PixelUi";
import type { ReactNode } from "react";

/** Public site chrome: navigation, footer, the pixel engine and Pip. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <PixelProvider>
      <MotionProvider>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <PixelUi />
      </MotionProvider>
    </PixelProvider>
  );
}
