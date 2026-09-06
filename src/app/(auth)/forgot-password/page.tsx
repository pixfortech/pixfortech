import { AuthCard } from "@/components/app/AuthCard";
import { ForgotForm } from "./ForgotForm";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMetadata({ title: "Reset password", description: "Reset your Pixel Forge password.", path: "/forgot-password", noIndex: true });

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" lead="Tell us the email on the account. If it exists, a reset link is on its way." footer={<Link href="/login" className="link-line text-bone-50">Back to sign in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
