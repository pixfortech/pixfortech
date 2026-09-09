import { describe, expect, it } from "vitest";
import { cleanBio, normaliseUsername, slugify, suggestSlug, suggestUsername, validateSlug, validateSocialUrl, validateUsername } from "../identity";
import { isReservedSlug, RESERVED_SLUGS } from "../reserved";

describe("usernames", () => {
  it("normalises case and a leading @", () => {
    expect(normaliseUsername("  @Aman.Chaurasia ")).toBe("aman.chaurasia");
    expect(validateUsername("Aman_Rahul")).toEqual({ ok: true, value: "aman_rahul" });
  });
  it("enforces length", () => {
    expect(validateUsername("ab")).toMatchObject({ ok: false });
    expect(validateUsername("a".repeat(31))).toMatchObject({ ok: false });
    expect(validateUsername("a".repeat(30))).toMatchObject({ ok: true });
  });
  it("accepts only safe characters and single separators", () => {
    for (const bad of ["aman chaurasia", "aman__c", "aman..c", ".aman", "aman.", "am@n", "aman-c", "ämän", "a/b"]) expect(validateUsername(bad), bad).toMatchObject({ ok: false });
    expect(validateUsername("aman.c_2")).toMatchObject({ ok: true });
  });
  it("rejects reserved system names in any case", () => {
    for (const name of ["admin", "ADMIN", "api", "login", "portal", "settings", "account", "auth", "work", "services", "contact", "about", "privacy", "terms", "404", "super_admin", "pixel_forge"]) {
      expect(validateUsername(name), name).toMatchObject({ ok: false });
    }
  });
});

describe("public slugs", () => {
  it("slugifies names into lowercase hyphenated form", () => {
    expect(slugify("Aman Rahul Chaurasia")).toBe("aman-rahul-chaurasia");
    expect(slugify("  Zoë O'Brien!! ")).toBe("zoe-obrien");
    expect(slugify("Ünïcode -- Test")).toBe("unicode-test");
  });
  it("validates canonical form only", () => {
    expect(validateSlug("aman-rahul-chaurasia")).toEqual({ ok: true, value: "aman-rahul-chaurasia" });
    expect(validateSlug("Aman-Chaurasia")).toEqual({ ok: true, value: "aman-chaurasia" });
    for (const bad of ["aman--c", "-aman", "aman_c", "12345", "ab", "aman c", "aman.c"]) expect(validateSlug(bad), bad).toMatchObject({ ok: false });
  });
  it("rejects reserved slugs and every reserved entry is itself canonical", () => {
    for (const r of ["admin", "people", "404", "api", "pixel-forge"]) expect(validateSlug(r), r).toMatchObject({ ok: false });
    for (const r of RESERVED_SLUGS) expect(r, r).toBe(r.toLowerCase());
    expect(isReservedSlug("PORTAL")).toBe(true);
  });
  it("suggests unique-looking alternatives", () => {
    expect(suggestSlug("Aman Chaurasia")).toBe("aman-chaurasia");
    expect(suggestSlug("Aman Chaurasia", 1)).toBe("aman-chaurasia-2");
    expect(suggestUsername("Aman Chaurasia")).toBe("aman_chaurasia");
    expect(suggestUsername("Aman Chaurasia", 2)).toBe("aman_chaurasia3");
    expect(suggestSlug("!!!")).toBe("forger");
  });
});

describe("social links and bio", () => {
  it("accepts https links on the right hosts and rejects the rest", () => {
    expect(validateSocialUrl("linkedin", "linkedin.com/in/aman")).toEqual({ ok: true, value: "https://linkedin.com/in/aman" });
    expect(validateSocialUrl("linkedin", "https://www.linkedin.com/in/aman")).toMatchObject({ ok: true });
    expect(validateSocialUrl("linkedin", "https://evil.example/in/aman")).toMatchObject({ ok: false });
    expect(validateSocialUrl("github", "https://github.com/pixfortech")).toMatchObject({ ok: true });
    expect(validateSocialUrl("website", "ftp://example.com")).toMatchObject({ ok: false });
    expect(validateSocialUrl("website", "javascript:alert(1)")).toMatchObject({ ok: false });
    expect(validateSocialUrl("website", "https://user:pw@example.com")).toMatchObject({ ok: false });
    expect(validateSocialUrl("website", "")).toEqual({ ok: true, value: "" });
  });
  it("keeps bios as plain text", () => {
    expect(cleanBio("Hello <b>world</b>\n\n\n\nTwo")).toBe("Hello world\n\nTwo");
    expect(cleanBio("x".repeat(700)).length).toBe(600);
  });
});
