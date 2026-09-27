import { describe, expect, it } from "vitest";
import { copy } from "@content/microcopy";
import { signInErrorMessage } from "../sign-in-error";

describe("sign-in error mapping", () => {
  it("only EMAIL_NOT_VERIFIED means the email needs verifying", () => {
    expect(signInErrorMessage({ status: 403, code: "EMAIL_NOT_VERIFIED" })).toBe("unverified");
  });
  it.each(["INVALID_ORIGIN", "INVALID_CALLBACK_URL", "INVALID_REDIRECT_URL", undefined])("a 403 %s is an address problem, never 'verify'", (code) => {
    const msg = signInErrorMessage({ status: 403, code });
    expect(msg).toBe(copy.auth.loginOrigin);
    expect(msg).not.toMatch(/verif/i);
  });
  it("wrong credentials, rate limits and outages read as themselves", () => {
    expect(signInErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(copy.auth.loginWrong);
    expect(signInErrorMessage({ status: 429 })).toBe(copy.auth.loginRateLimited);
    expect(signInErrorMessage({ status: 502 })).toBe(copy.auth.loginUnavailable);
  });
});
