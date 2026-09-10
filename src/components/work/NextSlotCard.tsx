import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * The slot after the real projects. Deliberately not a case study: dashed
 * edge, forge accent, a heading that talks to the reader and one button.
 */
export function NextSlotCard({ className }: { className?: string }) {
  return (
    <aside className={className} aria-labelledby="next-slot-title" data-testid="next-slot">
      <div className="relative flex h-full min-h-[18rem] flex-col justify-center overflow-hidden rounded-md border border-dashed border-forge-500/60 bg-[radial-gradient(ellipse_at_80%_110%,rgba(255,90,44,0.18),transparent_60%)] p-7 sm:p-8">
        <div className="absolute inset-0 grid-lines opacity-40 [mask-image:linear-gradient(to_top,black,transparent_70%)]" aria-hidden="true" />
        <div className="relative">
          <Eyebrow className="mb-6 text-forge-300">Next slot</Eyebrow>
          <h3 id="next-slot-title" className="h3 max-w-[18ch]">This could be yours. No pressure. PiP is watching.</h3>
          <p className="mt-4 max-w-[34ch] text-bone-300">Got a website that needs building, rebuilding or rescuing from 2014? There&rsquo;s room on the bench.</p>
        </div>
        <div className="relative mt-8">
          <Button href="/contact" size="lg" arrow>Bring us the brief</Button>
        </div>
      </div>
    </aside>
  );
}
