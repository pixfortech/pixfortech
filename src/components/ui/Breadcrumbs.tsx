import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="eyebrow">
      <JsonLd data={breadcrumbSchema(items)} />
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${item.path}`} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-bone-200">{item.name}</span>
              ) : (
                <Link href={item.path} className="hover:text-bone-50 transition-colors">{item.name}</Link>
              )}
              {!last && <span aria-hidden="true" className="text-bone-600">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
