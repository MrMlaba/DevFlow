import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const redirect = typeof params.redirect === "string" ? params.redirect : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Sign in to DevFlow</h1>
        <p className="text-muted-foreground text-sm">
          Manage projects, tasks, and deployments in one place.
        </p>
      </div>
      <LoginForm redirectTo={redirect} />
      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
