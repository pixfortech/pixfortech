/** Use the configured public origin behind a hosting proxy, never forwarded headers. */
export function isTrustedUploadOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl && process.env.NODE_ENV === "production") return false;
  try {
    return origin === new URL(appUrl || request.url).origin;
  } catch {
    return false;
  }
}
