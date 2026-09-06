export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="border-t border-line">
      {items.map((f) => (
        <details key={f.q} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium text-bone-50 [&::-webkit-details-marker]:hidden hover:text-forge-300 transition-colors">
            <span>{f.q}</span>
            <span aria-hidden="true" className="relative block h-5 w-5 shrink-0 text-bone-400 transition-transform duration-(--dur-base) group-open:rotate-45 group-open:text-forge-400">
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
              <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
            </span>
          </summary>
          <p className="pb-6 text-bone-200 max-w-prose">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
