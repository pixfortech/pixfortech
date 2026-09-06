"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Results = { projects: { id: string; code: string; title: string; status: string }[]; tasks: { id: string; key: string; title: string; status: string }[]; requests: { id: string; number: number; title: string; status: string }[]; files: { id: string; name: string; projectId: string }[]; clients: { id: string; name: string }[]; messages: { id: string; body: string; conversationId: string; requestId: string | null; projectId: string }[] };

type Item = { label: string; hint: string; href: string; group: string };

/** ⌘K / Ctrl+K search over projects, tasks, requests, files, clients and messages the user may see. */
export function CommandPalette({ area, links }: { area: "portal" | "admin"; links: { label: string; href: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navItems = useMemo(() => links.filter((l) => l.label.toLowerCase().includes(q.trim().toLowerCase())).map((l) => ({ label: l.label, hint: "Go to", href: l.href, group: "Navigate" })), [links, q]);
  const searching = q.trim().length >= 2;
  const items = searching ? results : navItems;

  const openPalette = (next: boolean) => { setOpen(next); if (next) { setQ(""); setResults([]); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => { const next = !v; if (next) setTimeout(() => inputRef.current?.focus(), 20); return next; }); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const onOpen = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 20); };
    window.addEventListener("pf:open-search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pf:open-search", onOpen); };
  }, []);

  useEffect(() => {
    if (!open || !searching) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const r = (await res.json()) as Results;
        const out: Item[] = [];
        for (const p of r.projects) out.push({ label: p.title, hint: `${p.code} · ${p.status.replace(/_/g, " ")}`, href: `/${area}/projects/${p.id}`, group: "Projects" });
        for (const x of r.requests) out.push({ label: x.title, hint: `PF-REQ-${String(x.number).padStart(4, "0")} · ${x.status.replace(/_/g, " ")}`, href: `/${area}/requests/${x.id}`, group: "Requests" });
        for (const x of r.tasks) out.push({ label: x.title, hint: `${x.key} · ${x.status.replace(/_/g, " ")}`, href: `/${area}/tasks/${x.id}`, group: "Tasks" });
        for (const x of r.files) out.push({ label: x.name, hint: "File", href: `/${area}/projects/${x.projectId}/files`, group: "Files" });
        for (const x of r.clients) out.push({ label: x.name, hint: "Client", href: `/admin/clients/${x.id}`, group: "Clients" });
        for (const x of r.messages) out.push({ label: x.body.slice(0, 80), hint: "Message", href: x.requestId ? `/${area}/requests/${x.requestId}` : `/${area}/projects/${x.projectId}/messages`, group: "Messages" });
        setResults(out); setActive(0);
      } catch { /* aborted */ } finally { setLoading(false); }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open, area, searching]);

  const go = (item: Item) => { openPalette(false); router.push(item.href); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center bg-ink-950/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) openPalette(false); }}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-lg border border-line bg-ink-850 shadow-2">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="text-bone-400" aria-hidden="true">⌕</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); } if (e.key === "Enter" && items[active]) go(items[active]); }} placeholder="Search projects, requests, tasks, files…" aria-label="Search" className="h-12 flex-1 bg-transparent text-[0.9375rem] text-bone-50 placeholder:text-bone-600 focus:outline-none" />
          <kbd className="rounded-xs border border-line px-1.5 text-[0.6875rem] text-bone-400">esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {loading && <li className="px-4 py-2 text-[0.8125rem] text-bone-400">Searching…</li>}
          {!loading && items.length === 0 && <li className="px-4 py-6 text-center text-[0.8125rem] text-bone-400">Nothing matched. The forge keeps tidy records, so try another word.</li>}
          {items.map((it, i) => (
            <li key={it.href + it.label} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(it)} className={cn("flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5", i === active && "bg-bone-50/5")}>
              <span className="min-w-0"><span className="block truncate text-[0.875rem] text-bone-50">{it.label}</span><span className="block truncate text-[0.75rem] text-bone-400">{it.hint}</span></span>
              <span className="shrink-0 text-[0.6875rem] uppercase tracking-[0.08em] text-bone-600">{it.group}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
