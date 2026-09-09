"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileDropzone } from "./FileDropzone";
import { AppButton } from "@/components/app/primitives";
import { useRealtime } from "@/components/app/RealtimeProvider";

/** Uploads straight to a project/request/task with progress. */
export function Uploader({ projectId, requestId, taskId, staff, compact }: { projectId: string; requestId?: string; taskId?: string; staff?: boolean; compact?: boolean }) {
  const router = useRouter();
  const { toast } = useRealtime();
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!files.length || progress !== null) return;
    setError(null);
    setProgress(0);
    const total = files.reduce((n, f) => n + f.size, 0);
    let uploaded = 0;
    const call = async (url: string, init: RequestInit) => {
      const response = await fetch(url, init);
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Upload failed.");
      return json;
    };
    try {
      for (const file of files) {
        const { id, chunkBytes } = await call("/api/upload/chunks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, mime: file.type, size: file.size, target: { projectId, requestId, taskId, clientVisible: staff ? visible : true } }) });
        for (let offset = 0, part = 0; offset < file.size; offset += chunkBytes, part++) {
          const chunk = file.slice(offset, offset + chunkBytes);
          await call(`/api/upload/chunks?id=${id}&part=${part}`, { method: "PUT", body: chunk });
          uploaded += chunk.size;
          setProgress(Math.min(99, Math.round(uploaded / total * 100)));
        }
        await call(`/api/upload/chunks?id=${id}&finish=1`, { method: "POST" });
      }
      setFiles([]);
      toast({ title: `${files.length} file${files.length > 1 ? "s" : ""} uploaded`, kind: "success" });
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Network problem during upload."); }
    finally { setProgress(null); }
  }

  return (
    <div className={compact ? "" : "rounded-lg border border-line bg-ink-850/60 p-4"}>
      <FileDropzone files={files} onChange={setFiles} />
      {progress !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-ink-700" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress"><div className="h-full bg-forge-500 transition-[width]" style={{ width: `${progress}%` }} /></div>
      )}
      {error && <p role="alert" className="mt-2 text-[0.8125rem] text-forge-300">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {staff ? (
          <label className="flex items-center gap-2 text-[0.8125rem] text-bone-200"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="accent-forge-500" /> Visible to the client</label>
        ) : <span />}
        <AppButton size="sm" onClick={upload} disabled={!files.length || progress !== null}>{progress !== null ? `Uploading ${progress}%` : `Upload${files.length ? ` ${files.length}` : ""}`}</AppButton>
      </div>
    </div>
  );
}
