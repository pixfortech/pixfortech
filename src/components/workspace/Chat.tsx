"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { uploadPrivateFile } from "@/lib/uploadPrivateFile";
import { useRouter } from "next/navigation";
import { markConversationReadAction, sendMessageAction, typingAction } from "@/server/actions/collab";
import { useRealtime } from "@/components/app/RealtimeProvider";
import { Avatar, Badge, timeAgo } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import { formatBytes } from "./format";

export type ChatMessage = { id: string; body: string; createdAt: Date; authorId: string; authorName: string; authorImage: string | null; authorRole: string; replyToId: string | null; files: { id: string; name: string; mime: string; size: number }[] };
export type Reader = { id: string; name: string; lastReadAt: Date | null };

const STAFF = ["super_admin", "admin", "project_manager", "team_member"];

export function Chat({ conversationId, projectId, messages, readers, currentUserId, internal, participants, compact }: { conversationId: string; projectId: string; messages: ChatMessage[]; readers: Reader[]; currentUserId: string; internal?: boolean; participants: { id: string; name: string }[]; compact?: boolean }) {
  const router = useRouter();
  const { subscribe, toast } = useRealtime();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages.length]);
  useEffect(() => { markConversationReadAction({ conversationId }); }, [conversationId, messages.length]);
  useEffect(() => subscribe((type, data) => {
    if (type === "typing" && data.conversationId === conversationId && data.userId !== currentUserId) {
      setTyping((t) => ({ ...t, [String(data.userId)]: { name: String(data.name), at: Date.now() } }));
    }
  }), [subscribe, conversationId, currentUserId]);
  useEffect(() => { const i = setInterval(() => setTyping((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => Date.now() - v.at < 3500))), 1000); return () => clearInterval(i); }, []);

  function send() {
    const body = text.trim();
    if (!body && !files.length) return;
    start(async () => {
      const res = await sendMessageAction({ conversationId, body: body || (files.length ? `Shared ${files.length} file${files.length > 1 ? "s" : ""}` : ""), replyToId: replyTo?.id ?? "" });
      if (!res.ok) return;
      if (files.length) {
        try {
          for (const file of files) {
            await uploadPrivateFile(file, { projectId, messageId: res.data!.id });
            setFiles((remaining) => remaining.filter((candidate) => candidate !== file));
          }
        } catch {
          toast({ title: "Message sent, but attachments failed", body: "The remaining files are still selected. Try sending them again.", kind: "error" });
        }
      }
      setText(""); setReplyTo(null);
      router.refresh();
    });
  }
  const onType = (v: string) => { setText(v); if (Date.now() - lastTyping.current > 2000) { lastTyping.current = Date.now(); typingAction({ conversationId }); } };
  const mention = (name: string) => setText((t) => `${t}${t.endsWith(" ") || !t ? "" : " "}@${name.split(" ")[0]} `);

  const readBy = (m: ChatMessage) => readers.filter((r) => r.id !== m.authorId && r.lastReadAt && r.lastReadAt.getTime() >= m.createdAt.getTime());
  const typers = Object.values(typing).map((t) => t.name);

  return (
    <div className={cn("flex flex-col rounded-lg border border-line bg-ink-850/60", compact ? "h-[26rem]" : "h-[min(38rem,calc(100svh-14rem))]", internal && "pf-internal")}>
      {internal && <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[0.75rem] font-medium text-[#f5c98a]"><Badge tone="internal">Internal</Badge> Staff only. Clients never see this channel.</div>}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <p className="py-10 text-center text-[0.8125rem] text-bone-400">No messages yet. Say hello; the pixels are listening.</p>}
        <ol className="flex flex-col gap-4">
          {messages.map((m, i) => {
            const mine = m.authorId === currentUserId;
            const prev = messages[i - 1];
            const grouped = prev && prev.authorId === m.authorId && m.createdAt.getTime() - prev.createdAt.getTime() < 5 * 60000;
            const reply = m.replyToId ? messages.find((x) => x.id === m.replyToId) : null;
            const seen = readBy(m);
            return (
              <li key={m.id} className={cn("flex gap-3", grouped && "-mt-2")}>
                <div className="w-7 shrink-0">{!grouped && <Avatar name={m.authorName} image={m.authorImage} size={28} />}</div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <p className="flex flex-wrap items-baseline gap-x-2 text-[0.75rem]">
                      <span className="font-semibold text-bone-50">{m.authorName}</span>
                      {STAFF.includes(m.authorRole) && <span className="text-forge-300">Pixel Forge</span>}
                      <span className="text-bone-600">{timeAgo(m.createdAt)}</span>
                    </p>
                  )}
                  {reply && <p className="mt-1 truncate border-l-2 border-line-strong pl-2 text-[0.75rem] text-bone-400">↩ {reply.authorName}: {reply.body.slice(0, 80)}</p>}
                  <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-bone-200">{renderMentions(m.body)}</p>
                  {m.files.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">{m.files.map((f) => <li key={f.id}><a href={`/api/files/${f.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[0.75rem] text-bone-200 hover:border-bone-50">{f.name} <span className="text-bone-600">{formatBytes(f.size)}</span></a></li>)}</ul>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[0.6875rem] text-bone-600">
                    <button type="button" onClick={() => setReplyTo(m)} className="hover:text-bone-200">Reply</button>
                    {!mine && <button type="button" onClick={() => mention(m.authorName)} className="hover:text-bone-200">Mention</button>}
                    {mine && seen.length > 0 && <span title={seen.map((s) => s.name).join(", ")}>Seen by {seen.length}</span>}
                    {mine && seen.length === 0 && i === messages.length - 1 && <span>Delivered</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="border-t border-line p-3">
        <p className="h-4 px-1 text-[0.6875rem] text-bone-400" aria-live="polite">{typers.length ? `${typers.join(", ")} ${typers.length > 1 ? "are" : "is"} typing…` : ""}</p>
        {replyTo && <p className="mb-1 flex items-center justify-between rounded-md bg-ink-900 px-2 py-1 text-[0.75rem] text-bone-400">Replying to {replyTo.authorName} <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></p>}
        {files.length > 0 && <p className="mb-1 px-1 text-[0.75rem] text-bone-400">{files.map((f) => f.name).join(", ")} <button type="button" onClick={() => setFiles([])} className="ml-1 text-bone-200">clear</button></p>}
        <div className="flex items-end gap-2">
          <textarea disabled={!hydrated} value={text} onChange={(e) => onType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={internal ? "Internal note to the team…" : "Write a message. @name to mention someone."} aria-label="Message" className="max-h-32 min-h-10 flex-1 resize-y rounded-md border border-line bg-ink-900 px-3 py-2 text-[0.875rem] text-bone-50 placeholder:text-bone-600 focus:border-forge-400 focus:outline-none" />
          <input disabled={!hydrated} ref={fileInput} type="file" multiple className="sr-only" aria-label="Attach files" onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="grid h-10 w-10 place-items-center rounded-md border border-line text-bone-400 hover:border-bone-50 hover:text-bone-50" aria-label="Attach files">＋</button>
          <button type="button" onClick={send} disabled={pending || (!text.trim() && !files.length)} className="h-10 rounded-md bg-bone-50 px-4 text-[0.875rem] font-medium text-ink-950 hover:bg-forge-500 disabled:opacity-50">Send</button>
        </div>
        <p className="mt-1 hidden px-1 text-[0.6875rem] text-bone-600 sm:block">Enter to send · Shift+Enter for a new line{participants.length ? ` · ${participants.length} people in this conversation` : ""}</p>
      </div>
    </div>
  );
}

function renderMentions(body: string) {
  const parts = body.split(/(@[A-Za-z][\w-]*)/g);
  return parts.map((p, i) => (p.startsWith("@") ? <span key={i} className="rounded-xs bg-forge-500/15 px-1 text-forge-300">{p}</span> : p));
}
