const items = ["Design", "Development", "E-commerce", "Digital products", "Performance"];

function Track({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item} className="flex items-center">
          <span className="font-display text-[clamp(1.375rem,0.9rem+2vw,2.5rem)] font-semibold uppercase tracking-[-0.02em] text-bone-50 px-6 sm:px-10">
            {item}
          </span>
          <span className="h-2.5 w-2.5 bg-forge-500" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}

/** Understated marquee. Duplicated track for a seamless loop; second copy is hidden from AT. */
export function CapabilitiesStrip() {
  return (
    <section aria-label="Capabilities" className="relative border-y border-line bg-ink-950/60 py-5 sm:py-7 overflow-hidden mask-fade-x">
      <div className="marquee-track flex w-max">
        <Track />
        <Track hidden />
      </div>
    </section>
  );
}
