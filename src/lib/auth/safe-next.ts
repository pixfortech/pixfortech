/**
 * A post-sign-in destination is honoured only when it is a plain path on this
 * site. Rejects protocol-relative (`//host`), backslash (`/\host`, which
 * browsers treat as `//host`), absolute and scheme URLs, control characters,
 * and anything that resolves to another origin. Returns the normalised path
 * (with query and hash) or undefined.
 */
const PROBE = "https://pixfortech.invalid";

export function safeNext(value: string | null | undefined): string | undefined {
  if (!value || value.length > 2048) return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return undefined;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return undefined;
  try {
    const url = new URL(value, PROBE);
    if (url.origin !== PROBE) return undefined;
    // Encoded tricks (/%2F%2Fhost, /%5Chost) are harmless paths here, but a later decode could make them hosts.
    let decoded: string;
    try { decoded = decodeURIComponent(url.pathname); } catch { return undefined; }
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return undefined;
    return url.pathname + url.search + url.hash;
  } catch {
    return undefined;
  }
}
