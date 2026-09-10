import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedUploadOrigin } from "../auth/request-origin";

afterEach(() => vi.unstubAllEnvs());
const app = "https://candidate.example.com";
function request(origin?: string, extra: Record<string, string> = {}) {
  return new Request("http://internal-host/api/upload/chunks", { headers: { ...extra, ...(origin ? { origin } : {}) } });
}
describe("upload origin behind a hosting proxy", () => {
  it("accepts the configured public origin despite an internal request URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", app);
    expect(isTrustedUploadOrigin(request(app))).toBe(true);
  });
  it.each([undefined, "null", "invalid", "https://foreign.example.com", "http://candidate.example.com", "https://candidate.example.com.evil.test", app + "/path"])("rejects an untrusted Origin %s", (origin) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", app);
    expect(isTrustedUploadOrigin(request(origin, { "x-forwarded-host": "foreign.example.com" }))).toBe(false);
  });
  it("fails closed when production origin configuration is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(isTrustedUploadOrigin(request("http://internal-host"))).toBe(false);
  });
  it("supports local development without a configured app URL", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(isTrustedUploadOrigin(new Request("http://localhost:3100/api/upload/chunks", { headers: { origin: "http://localhost:3100" } }))).toBe(true);
  });
});
