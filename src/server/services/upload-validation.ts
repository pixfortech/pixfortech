import path from "node:path";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Allowed types by extension and MIME, plus magic-byte checks for binary formats. */
const ALLOWED: Record<string, string[]> = {
  png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"], svg: ["image/svg+xml"], gif: ["image/gif"],
  pdf: ["application/pdf"], doc: ["application/msword"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"], xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  txt: ["text/plain"], md: ["text/markdown", "text/plain"], csv: ["text/csv", "text/plain"], zip: ["application/zip", "application/x-zip-compressed"],
};

function sniff(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buf.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b) return "application/zip"; // zip, docx, xlsx
  if (buf[0] === 0xd0 && buf[1] === 0xcf) return "application/msword"; // legacy office
  return null;
}

/** Validates name, size, extension, declared MIME and magic bytes. Never trusts the extension alone. */
export function validateUpload(name: string, declaredMime: string, buf: Buffer): { ok: true; mime: string; ext: string } | { ok: false; reason: string } {
  if (buf.length === 0) return { ok: false, reason: "The file is empty." };
  if (buf.length > MAX_FILE_BYTES) return { ok: false, reason: "Files must be under 25 MB." };
  const ext = path.extname(name).replace(".", "").toLowerCase();
  const allowed = ALLOWED[ext];
  if (!allowed) return { ok: false, reason: `“.${ext || "?"}” files are not accepted.` };
  const sniffed = sniff(buf);
  const textual = ["txt", "md", "csv", "svg"].includes(ext);
  if (!textual) {
    const expected = ext === "docx" || ext === "xlsx" ? "application/zip" : ext === "doc" || ext === "xls" ? "application/msword" : allowed[0];
    if (sniffed !== expected) return { ok: false, reason: "The file contents do not match its extension." };
  } else if (ext === "svg") {
    const text = buf.toString("utf8");
    if (!/<svg[\s>]/i.test(text.slice(0, 2048))) return { ok: false, reason: "That does not look like an SVG." };
    if (/<script|on[a-z]+\s*=|javascript:|<foreignObject/i.test(text)) return { ok: false, reason: "SVGs with scripts or event handlers are not accepted." };
  }
  const mime = allowed.includes(declaredMime) ? declaredMime : allowed[0];
  return { ok: true, mime, ext };
}

/** Strip control characters and path separators from a user-supplied name. */
export function safeFilename(name: string): string {
  const base = path.basename(name);
  let out = "";
  for (const ch of base) { const c = ch.charCodeAt(0); out += c < 32 || c === 127 ? "" : ch; }
  return out.replace(/[\\/]/g, "").trim().slice(0, 180) || "file";
}
