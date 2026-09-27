import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { homeFor } from "@/server/auth/permissions";

/**
 * Fallback router for flows that cannot know the role in the browser (magic
 * links, Google, old bookmarks). Password sign-in goes straight to the
 * dashboard and never passes through here. Deliberately has no loading.tsx:
 * without one this answers with an immediate HTTP 307, so the browser never
 * paints anything for this route; a loading screen would turn it into a
 * streamed page that redirects only once JavaScript runs.
 */
export default async function RedirectPage() {
  const user = await getSessionUser();
  redirect(user ? homeFor(user) : "/login");
}
