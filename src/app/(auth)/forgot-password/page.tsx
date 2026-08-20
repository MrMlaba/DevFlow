import Link from "next/link";
import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ll email you a link to choose a new password.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
