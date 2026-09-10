import { AuthCard } from "@/components/app/AuthCard";
import { LoginForm } from "./LoginForm";
import { getSessionUser } from "@/server/auth/session";
import { homeFor } from "@/server/auth/permissions";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { copy } from "@content/microcopy";
import { AuthPipPage } from "@/pixel/auth/AuthPipPage";

export const metadata = pageMetadata({ title: "Sign in", description: "Sign in to the Pixel Forge client portal.", path: "/login", noIndex: true });

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; verified?: string; signedout?: string; reset?: string }> }) {
  const { next, error, verified, signedout, reset } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : homeFor(user));
  const google = Boolean(process.env.GOOGLE_CLIENT_ID);
  return (
    <AuthCard title={copy.auth.loginTitle} lead={copy.auth.loginLead} footer={<>{copy.auth.loginFooter} <Link href="/forgot-password" className="link-line text-bone-50">{copy.auth.loginFooterLink}</Link></>}>
      <AuthPipPage page={signedout ? "signedout" : verified ? "verified" : reset ? "resetComplete" : "login"} />
      {signedout && <p className="mb-4 rounded-md border border-line bg-ink-900 px-3 py-2 text-[0.8125rem] text-bone-300" data-testid="signed-out-note">{copy.auth.signedOut}</p>}
      {reset && <p className="mb-4 rounded-md border border-[#7ed0a2]/40 bg-[#7ed0a2]/10 px-3 py-2 text-[0.8125rem] text-[#9fe0bb]">{copy.auth.resetDone}</p>}
      {verified && <p className="mb-4 rounded-md border border-[#7ed0a2]/40 bg-[#7ed0a2]/10 px-3 py-2 text-[0.8125rem] text-[#9fe0bb]">{copy.auth.loginVerified}</p>}
      {error && <p className="mb-4 rounded-md border border-forge-500/40 bg-forge-500/10 px-3 py-2 text-[0.8125rem] text-forge-300">{decodeURIComponent(error)}</p>}
      <LoginForm next={next && next.startsWith("/") ? next : undefined} google={google} />
    </AuthCard>
  );
}
