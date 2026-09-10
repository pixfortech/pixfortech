import { AuthCard } from "@/components/app/AuthCard";
import { ForgotForm } from "./ForgotForm";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { copy } from "@content/microcopy";
import { AuthPipPage } from "@/pixel/auth/AuthPipPage";

export const metadata = pageMetadata({ title: "Reset password", description: "Reset your Pixel Forge password.", path: "/forgot-password", noIndex: true });

export default function ForgotPasswordPage() {
  return (
    <AuthCard title={copy.auth.forgotTitle} lead={copy.auth.forgotLead} footer={<Link href="/login" className="link-line text-bone-50">Back to sign in</Link>}>
      <AuthPipPage page="forgot" />
      <ForgotForm />
    </AuthCard>
  );
}
