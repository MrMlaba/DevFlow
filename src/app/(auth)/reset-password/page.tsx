import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-muted-foreground text-sm">
          You&apos;re signed in from the reset link - pick a new password below.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
