type Props = { data: Record<string, unknown> | Record<string, unknown>[] };

/** Renders JSON-LD structured data. Safe: content comes from our own content layer. */
export function JsonLd({ data }: Props) {
  const list = Array.isArray(data) ? data : [data];
  return (
    <>
      {list.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
