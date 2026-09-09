import { isReservedSlug } from "./reserved";

/**
 * Pure username and public-slug rules. No database access: uniqueness is
 * checked by the profile service, everything else is decided here so the
 * server and the live form validation agree.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const SLUG_MIN = 3;
export const SLUG_MAX = 60;

export type IdentityCheck = { ok: true; value: string } | { ok: false; reason: string };

/** Usernames: lowercase letters, digits, single dots or underscores between them. Case-insensitive uniqueness. */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function validateUsername(raw: string): IdentityCheck {
  const value = normaliseUsername(raw);
  if (!value) return { ok: false, reason: "Pick a username." };
  if (value.length < USERNAME_MIN) return { ok: false, reason: `At least ${USERNAME_MIN} characters.` };
  if (value.length > USERNAME_MAX) return { ok: false, reason: `At most ${USERNAME_MAX} characters.` };
  if (!/^[a-z0-9]+(?:[._][a-z0-9]+)*$/.test(value)) return { ok: false, reason: "Letters, numbers, and single dots or underscores between them." };
  if (isReservedSlug(value) || isReservedSlug(value.replace(/[._]/g, "-"))) return { ok: false, reason: "That one is taken by the building." };
  return { ok: true, value };
}

/** Public slugs: lowercase, hyphenated, URL-safe. */
export function slugify(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function validateSlug(raw: string): IdentityCheck {
  const value = raw.trim().toLowerCase();
  if (!value) return { ok: false, reason: "Choose a profile address." };
  if (value !== slugify(value)) return { ok: false, reason: "Lowercase letters, numbers and single hyphens only." };
  if (value.length < SLUG_MIN) return { ok: false, reason: `At least ${SLUG_MIN} characters.` };
  if (value.length > SLUG_MAX) return { ok: false, reason: `At most ${SLUG_MAX} characters.` };
  if (/^\d+$/.test(value)) return { ok: false, reason: "Add at least one letter." };
  if (isReservedSlug(value)) return { ok: false, reason: "That address is reserved." };
  return { ok: true, value };
}

/** A sensible default slug from a display name, with a numeric suffix when asked. */
export function suggestSlug(name: string, attempt = 0): string {
  const base = slugify(name) || "forger";
  const suffix = attempt > 0 ? `-${attempt + 1}` : "";
  return `${base.slice(0, SLUG_MAX - suffix.length)}${suffix}`;
}

export function suggestUsername(name: string, attempt = 0): string {
  const base = slugify(name).replace(/-/g, "_").replace(/^_+|_+$/g, "") || "forger";
  const suffix = attempt > 0 ? String(attempt + 1) : "";
  return `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`;
}

/** Optional social links: only https URLs on the expected hosts, otherwise rejected. */
const HOSTS: Record<"linkedin" | "github" | "website", RegExp | null> = {
  linkedin: /(^|\.)linkedin\.com$/i,
  github: /(^|\.)github\.com$/i,
  website: null,
};
export function validateSocialUrl(kind: keyof typeof HOSTS, raw: string): IdentityCheck {
  const value = raw.trim();
  if (!value) return { ok: true, value: "" };
  let url: URL;
  try { url = new URL(value.includes("://") ? value : `https://${value}`); } catch { return { ok: false, reason: "That does not look like a web address." }; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "Links must start with https://." };
  if (url.username || url.password) return { ok: false, reason: "Links cannot contain credentials." };
  const host = HOSTS[kind];
  if (host && !host.test(url.hostname)) return { ok: false, reason: `Use a ${kind === "linkedin" ? "LinkedIn" : "GitHub"} address.` };
  if (url.href.length > 200) return { ok: false, reason: "That link is too long." };
  return { ok: true, value: url.href };
}

/** Bio is plain text. Strip control characters and tags; clients render it as text, never HTML. */
export function cleanBio(raw: string): string {
  let out = "";
  for (const ch of raw) { const c = ch.charCodeAt(0); if (c >= 32 || c === 10) out += ch; }
  return out.replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 600);
}
