"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { selectCls } from "@/components/app/primitives";

/** URL-backed filters: shareable, resettable, usable on phones. */
export function Filters({ fields }: { fields: { name: string; label: string; options: { value: string; label: string }[] }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value); else next.delete(name);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`);
  };
  const active = fields.some((f) => params.get(f.name));
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      {fields.map((f) => (
        <label key={f.name} className="text-[0.6875rem] uppercase tracking-[0.08em] text-bone-400">
          <span className="mb-1 block">{f.label}</span>
          <select value={params.get(f.name) ?? ""} onChange={(e) => set(f.name, e.target.value)} className={selectCls + " !w-auto min-w-[9rem] !py-1.5 normal-case tracking-normal"}>
            <option value="">All</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
      {active && <button type="button" onClick={() => router.replace(pathname)} className="h-8 rounded-md px-2 text-[0.75rem] text-bone-400 hover:text-bone-50">Reset</button>}
    </div>
  );
}
