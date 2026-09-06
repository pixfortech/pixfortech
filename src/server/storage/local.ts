import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageDriver } from "./index";

const ROOT = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));

function resolveSafe(key: string): string {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export class LocalStorage implements StorageDriver {
  readonly name = "local" as const;
  async put(key: string, body: Buffer) {
    const p = resolveSafe(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body, { flag: "wx" });
  }
  async get(key: string) {
    const p = resolveSafe(key);
    try {
      const s = await stat(p);
      return { stream: Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>, size: s.size };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    try { await unlink(resolveSafe(key)); } catch { /* already gone */ }
  }
  async presign() { return null; }
}
