import { trustedOriginsFrom } from "./origins";

/** Use the configured public origins behind a hosting proxy, never forwarded headers. */
export function isTrustedUploadOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl && process.env.NODE_ENV === "production") return false;
  try {
    if (!appUrl) return origin === new URL(request.url).origin;
    // The same set the auth endpoints accept, so the custom domain and the deploy host behave alike.
    return trustedOriginsFrom(process.env).includes(origin);
  } catch {
    return false;
  }
}
