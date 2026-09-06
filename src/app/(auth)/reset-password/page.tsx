import { AuthCard } from "@/components/app/AuthCard";
import { ResetForm } from "./ResetForm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Choose a new password", description: "Choose a new Pixel Forge password.", path: "/reset-password", noIndex: true });

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title="Choose a new password" lead="At least ten characters. A sentence you will remember beats a word you will forget.">
      {error === "INVALID_TOKEN" || !token ? (
        <p className="rounded-md border border-forge-500/40 bg-forge-500/10 px-3 py-2 text-[0.8125rem] text-forge-300">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
      ) : (
        <ResetForm token={token} />
      )}
    </AuthCard>
  );
}
