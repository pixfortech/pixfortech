"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatBytes } from "./format";
import { useHydrated } from "@/lib/useHydrated";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.svg,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.zip";

/** Selection-only dropzone: collects files for a parent form to upload. */
export function FileDropzone({ files, onChange, max = 10 }: { files: File[]; onChange: (f: File[]) => void; max?: number }) {
  const id = useId();
  const hydrated = useHydrated();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const add = (list: FileList | null) => { if (!list) return; onChange([...files, ...Array.from(list)].slice(0, max)); };
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={cn("flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center transition-colors", over ? "border-forge-500 bg-forge-500/5" : "border-line-strong")}
      >
        <p className="text-[0.8125rem] text-bone-200">Drag files here or <button type="button" disabled={!hydrated} onClick={() => input.current?.click()} className="font-medium text-forge-300 hover:text-forge-400">browse</button></p>
        <p className="mt-1 text-[0.6875rem] text-bone-600">PNG, JPG, WEBP, SVG, PDF, DOC, XLS, TXT, ZIP · up to 25 MB each · {max} files</p>
        <input ref={input} id={id} type="file" multiple disabled={!hydrated} accept={ACCEPT} className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} aria-label="Choose files" />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={f.name + i} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-1.5 text-[0.8125rem]">
              <span className="truncate text-bone-200">{f.name} <span className="text-bone-600">· {formatBytes(f.size)}</span></span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="text-bone-400 hover:text-bone-50" aria-label={`Remove ${f.name}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
