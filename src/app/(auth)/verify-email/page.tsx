import { AuthCard } from "@/components/app/AuthCard";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMetadata({ title: "Verify your email", description: "Verify your Pixel Forge email.", path: "/verify-email", noIndex: true });

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthCard title={error ? "That link did not work" : "Check your email"} lead={error ? "The verification link is invalid or has expired. Sign in to request a new one." : "We sent a verification link. Open it and the door unlocks."} footer={<Link href="/login" className="link-line text-bone-50">Back to sign in</Link>}>
      <p className="text-[0.875rem] text-bone-400">Links expire after an hour. If it has not arrived, the spam folder is the usual hiding place.</p>
    </AuthCard>
  );
}
