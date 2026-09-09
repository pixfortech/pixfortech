"use client";

import { behaviour, useBehaviour } from "../behaviour/store";
import { copy } from "@content/microcopy";
import { cn } from "@/lib/utils";

/**
 * The way back. Shown only while PiP is hidden: a quiet footer control and a
 * tiny pixel in the corner where he used to stand. Restoring is one press,
 * the same as hiding was.
 */
export function PipRestore({ className }: { className?: string }) {
  const s = useBehaviour();
  if (!s.dismissed) return null;
  return (
    <button type="button" onClick={() => behaviour.restore()} aria-label={copy.pip.show} data-testid="pip-restore" className={cn("group inline-flex items-center gap-2 text-[0.8125rem] text-bone-400 hover:text-bone-50", className)}>
      <span className="grid grid-cols-2 gap-px" aria-hidden="true">
        <span className="h-1.5 w-1.5 bg-bone-600 group-hover:bg-forge-500" /><span className="h-1.5 w-1.5 bg-bone-600 group-hover:bg-forge-500" />
        <span className="h-1.5 w-1.5 bg-bone-600 group-hover:bg-forge-500" /><span className="h-1.5 w-1.5 bg-forge-500" />
      </span>
      <span>{copy.pip.restoreLabel} <span className="link-line">{copy.pip.restoreHint}</span></span>
    </button>
  );
}

/** Corner pixel: sits exactly where PiP was, so muscle memory finds him. */
export function PipCornerRestore() {
  const s = useBehaviour();
  if (!s.dismissed) return null;
  return (
    <button type="button" onClick={() => behaviour.restore()} aria-label="Show the PiP mascot" title={copy.pip.restoreHint} data-testid="pip-corner-restore" className="pip-corner">
      <span aria-hidden="true" />
    </button>
  );
}
