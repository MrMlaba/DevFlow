import Link from "next/link";
import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Create your DevFlow account</h1>
        <p className="text-muted-foreground text-sm">
          Start tracking projects, tasks, and deployments today.
        </p>
      </div>
      <RegisterForm />
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
