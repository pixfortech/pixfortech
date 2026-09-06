import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { homeFor } from "@/server/auth/permissions";

/** Sends a signed-in user to the right home for their role. */
export default async function RedirectPage() {
  const user = await getSessionUser();
  redirect(user ? homeFor(user) : "/login");
}
