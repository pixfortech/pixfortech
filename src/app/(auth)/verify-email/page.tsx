import { headers } from "next/headers";
import Link from "next/link";
import { AuthCard } from "@/components/app/AuthCard";
import { pageMetadata } from "@/lib/seo";
import { AuthPipPage } from "@/pixel/auth/AuthPipPage";
import { auth } from "@/server/auth/auth";
import { copy } from "@content/microcopy";
import { VerifyEmailPanel } from "./VerifyEmailPanel";

export const metadata = pageMetadata({ title: "Verify your email", description: "Verify your Pixel Forge email.", path: "/verify-email", noIndex: true });

const looksLikeEmail = (v?: string) => Boolean(v && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const { error, email } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const footer = <Link href="/login" className="link-line text-bone-50">Back to sign in</Link>;

  // Verification is a once-only step: a verified session never sees a resend again.
  if (session?.user?.emailVerified) {
    return (
      <AuthCard title={copy.auth.verifyAlreadyTitle} lead={copy.auth.verifyAlreadyBody} footer={<Link href="/redirect" className="link-line text-bone-50">Carry on to your workspace</Link>}>
        <AuthPipPage page="verified" />
        <p className="text-[0.875rem] text-bone-400" data-testid="verify-already">{copy.auth.loginVerified}</p>
      </AuthCard>
    );
  }

  const address = session?.user?.email ?? (looksLikeEmail(email) ? email : undefined);
  return (
    <AuthCard eyebrow={error ? undefined : copy.auth.verifyTitle} title={error ? copy.auth.verifyErrorTitle : copy.auth.verifyLead} lead={error ? copy.auth.verifyErrorBody : undefined} footer={footer}>
      <AuthPipPage page={error ? "verifyError" : "verify"} />
      <VerifyEmailPanel email={address} />
      <p className="mt-4 text-[0.8125rem] text-bone-500">{copy.auth.verifySpam}</p>
    </AuthCard>
  );
}
