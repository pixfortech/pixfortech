import { Container } from "./Container";
import { Eyebrow } from "./Eyebrow";
import { LineReveal, Rise } from "./Entrance";
import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string | string[];
  lead?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
};

/** Inner-page opener with the same tone as the home hero, minus the scene. */
export function PageHeader({ eyebrow, title, lead, children, compact = false }: Props) {
  const lines = Array.isArray(title) ? title : [title];
  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="absolute inset-0 grid-lines opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden="true" />
      <Container className={compact ? "relative pt-32 pb-12 sm:pt-40 sm:pb-16" : "relative pt-32 pb-16 sm:pt-44 sm:pb-24"}>
        <Rise>
          <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
        </Rise>
        <h1 className={compact ? "h1 max-w-[20ch]" : "display max-w-[14ch]"}>
          <LineReveal lines={lines} delay={0.1} />
        </h1>
        {lead ? (
          <Rise delay={0.3}>
            <div className="lead mt-8 max-w-[38rem]">{lead}</div>
          </Rise>
        ) : null}
        {children ? <Rise delay={0.4} className="mt-10">{children}</Rise> : null}
      </Container>
    </header>
  );
}
