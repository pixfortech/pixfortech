import { AuthCard } from "@/components/app/AuthCard";
import { ResetForm } from "./ResetForm";
import { pageMetadata } from "@/lib/seo";
import { copy } from "@content/microcopy";

export const metadata = pageMetadata({ title: "Choose a new password", description: "Choose a new Pixel Forge password.", path: "/reset-password", noIndex: true });

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title={copy.auth.resetTitle} lead={copy.auth.resetLead}>
      {error === "INVALID_TOKEN" || !token ? (
        <p className="rounded-md border border-forge-500/40 bg-forge-500/10 px-3 py-2 text-[0.8125rem] text-forge-300">{copy.auth.resetInvalid}</p>
      ) : (
        <ResetForm token={token} />
      )}
    </AuthCard>
  );
}
