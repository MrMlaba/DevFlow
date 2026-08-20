"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signIn } from "@/features/auth/actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signIn, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && (
        <input type="hidden" name="redirect" value={redirectTo} />
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@university.edu"
          required
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground text-sm hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <SubmitButton className="w-full" pendingText="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
