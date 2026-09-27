import { describe, expect, it } from "vitest";
import { trustedOriginsFrom } from "../auth/origins";
import { maskEmail } from "@/lib/mask-email";

describe("trusted auth origins", () => {
  it("trusts the canonical domain and its www twin, plus Netlify's own deploy hosts", () => {
    const o = trustedOriginsFrom({
      NEXT_PUBLIC_APP_URL: "https://pixfortech.com",
      URL: "https://pixfortech.com",
      DEPLOY_PRIME_URL: "https://codex-final-experience-upgrade--pixfortech-production.netlify.app",
    });
    expect(o).toContain("https://pixfortech.com");
    expect(o).toContain("https://www.pixfortech.com");
    expect(o).toContain("https://codex-final-experience-upgrade--pixfortech-production.netlify.app");
    // No www twin is invented for platform hostnames.
    expect(o.some((x) => x.includes("www.codex-final"))).toBe(false);
  });
  it("still trusts the canonical domain when the app URL was left on the temporary host", () => {
    // The drift that makes a verified owner see "verify your email": app URL on netlify.app, site served on pixfortech.com.
    const o = trustedOriginsFrom({ NEXT_PUBLIC_APP_URL: "https://pixfortech-production.netlify.app", URL: "https://pixfortech.com" });
    expect(o).toContain("https://pixfortech.com");
    expect(o).toContain("https://www.pixfortech.com");
  });
  it("keeps exact origins only and ignores junk", () => {
    const o = trustedOriginsFrom({ NEXT_PUBLIC_APP_URL: "http://localhost:3000/some/path", BETTER_AUTH_TRUSTED_ORIGINS: " https://a.example.com/x ,not a url, javascript:alert(1)" });
    expect(o).toEqual(["http://localhost:3000", "https://a.example.com", "https://www.a.example.com"]);
  });
  it("masks addresses for display and logs", () => {
    expect(maskEmail("pixfortechofficial@gmail.com")).toBe("p***@gmail.com");
    expect(maskEmail("nope")).toBe("***");
  });
});
