import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

/**
 * Object storage behind one interface. Uploads never touch /public.
 *  - local: private directory on disk (STORAGE_DIR, default ./storage), streamed through an authorised route
 *  - s3: S3-compatible bucket (AWS S3, Cloudflare R2, MinIO) with presigned downloads
 */
export interface StorageDriver {
  readonly name: "local" | "s3";
  put(key: string, body: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number } | null>;
  delete(key: string): Promise<void>;
  /** Optional: a direct, expiring URL (S3 presign). Null means stream through the app. */
  presign(key: string, filename: string, mime: string, ttlSeconds: number): Promise<string | null>;
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (driver) return driver;
  if (process.env.NODE_ENV === "production" && process.env.STORAGE_DRIVER !== "s3") throw new Error("Production requires private S3-compatible storage.");
  driver = process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  return driver;
}

/** Storage keys are random; the original filename is only kept in the database. */
export function newStorageKey(ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8);
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(16).toString("hex")}${safeExt ? "." + safeExt : ""}`;
}

const secret = () => {
  const value = process.env.FILE_URL_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("FILE_URL_SECRET is required in production.");
  return value ?? "development-only-secret-change-me-please";
};

/** Signed, expiring download token so links can be shared inside the app safely. */
export function signDownload(fileId: string, userId: string, ttlSeconds = 600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${fileId}.${userId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyDownload(fileId: string, userId: string, token: string | null): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret()).update(`${fileId}.${userId}.${exp}`).digest("base64url");
  const a = Buffer.from(sig ?? ""), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Malware scanning hook. Wire an ICAP/ClamAV/cloud scanner here; the file
 * record stores the outcome. Returns "skipped" when no scanner is configured.
 */
export async function scanUpload(buffer: Buffer, mime: string): Promise<"clean" | "flagged" | "skipped"> {
  void buffer; void mime;
  return "skipped";
}
