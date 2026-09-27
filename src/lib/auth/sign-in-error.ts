import { copy } from "@content/microcopy";

/** Better Auth answers 403 for more than one reason; only EMAIL_NOT_VERIFIED means "verify". */
export function signInErrorMessage(error: { status?: number; code?: string }): string | "unverified" {
  if (error.code === "EMAIL_NOT_VERIFIED") return "unverified";
  if (error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD") return copy.auth.loginWrong;
  if (error.status === 429) return copy.auth.loginRateLimited;
  if (error.status === 403) return copy.auth.loginOrigin;
  if (error.status && error.status >= 500) return copy.auth.loginUnavailable;
  return copy.auth.loginWrong;
}
