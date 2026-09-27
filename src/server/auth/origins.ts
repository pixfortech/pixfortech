/**
 * Which browser origins may call the auth endpoints.
 *
 * Better Auth rejects a sign-in whose Origin is not trusted with a 403
 * (INVALID_ORIGIN). If the deployment's origin list drifts from the host the
 * site is actually served on (apex vs www, a custom domain vs the Netlify
 * hostname), every sign-in fails. This collects the deployment's own
 * configured origins, the hostnames Netlify injects for this deploy, and the
 * apex/www counterpart of every custom domain, as exact origins only.
 */
type Env = Record<string, string | undefined>;

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** apex <-> www counterpart for a custom https domain; nothing for platform hostnames or localhost. */
function counterpart(origin: string): string | null {
  const u = new URL(origin);
  if (u.protocol !== "https:") return null;
  const host = u.hostname;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".netlify.app") || host.split(".").length < 2) return null;
  const other = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  return `${u.protocol}//${other}${u.port ? `:${u.port}` : ""}`;
}

export function trustedOriginsFrom(env: Env): string[] {
  const seeds = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    // Netlify injects the site's primary URL and this deploy's URLs at build and runtime.
    env.URL,
    env.DEPLOY_PRIME_URL,
    env.DEPLOY_URL,
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ];
  const out = new Set<string>();
  for (const seed of seeds) {
    const origin = toOrigin(seed);
    if (!origin) continue;
    out.add(origin);
    const twin = counterpart(origin);
    if (twin) out.add(twin);
  }
  return [...out];
}
