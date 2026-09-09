import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageDriver } from "./index";

/** S3-compatible storage (AWS S3, Cloudflare R2, MinIO). Bucket must be private. */
export class S3Storage implements StorageDriver {
  readonly name = "s3" as const;
  private client: S3Client;
  private bucket: string;
  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    if (!this.bucket) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    this.client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" } : undefined,
    });
  }
  async put(key: string, body: Buffer, mime: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime }));
  }
  async get(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!res.Body) return null;
    return { stream: res.Body.transformToWebStream() as ReadableStream<Uint8Array>, size: Number(res.ContentLength ?? 0) };
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  async presign(key: string, filename: string, mime: string, ttlSeconds: number) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, ResponseContentType: mime === "image/svg+xml" ? "application/octet-stream" : mime }), { expiresIn: ttlSeconds });
  }
}
