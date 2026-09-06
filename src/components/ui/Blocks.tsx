import { parseBlocks } from "@/lib/utils";

/** Renders markdown-lite content from the content layer as semantic HTML. */
export function Blocks({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={className ?? "prose-pf"}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2": return <h2 key={i}>{b.text}</h2>;
          case "h3": return <h3 key={i}>{b.text}</h3>;
          case "ul": return <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ol>;
          default: return <p key={i}>{b.text}</p>;
        }
      })}
    </div>
  );
}
